import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DomSanitizer} from "@angular/platform-browser";
import {session, timeout} from "@src/app/app.common";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadEntities, CadHatch} from "@src/app/cad-viewer/cad-data/cad-entities";
import {addCadGongshi, getCadPreview, removeCadGongshi} from "@src/app/cad.utils";
import {ContextMenu} from "@src/app/mixins/ContextMenu.mixin";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService, CadStatus, SelectedCads} from "@src/app/services/app-status.service";
import {CadCollection, CadDataService} from "@src/app/services/cad-data.service";
import {copyToClipboard, Point, RSAEncrypt} from "@src/app/utils";
import {Nullable} from "@src/app/utils/types";
import {Collection, debounce} from "lodash";
import {openCadListDialog} from "../../dialogs/cad-list/cad-list.component";
import {openJsonEditorDialog} from "../../dialogs/json-editor/json-editor.component";

type SubCadsField = "cads" | "partners" | "components";

interface CadNode {
	data: CadData;
	img: string;
	checked: boolean;
	indeterminate: boolean;
	parent?: string;
}

@Component({
	selector: "app-sub-cads",
	templateUrl: "./sub-cads.component.html",
	styleUrls: ["./sub-cads.component.scss"]
})
export class SubCadsComponent extends ContextMenu(Subscribed()) implements OnInit, OnDestroy {
	cads: CadNode[] = [];
	partners: CadNode[] = [];
	components: CadNode[] = [];
	multiSelect = true;
	checkedIndex = -1;
	field?: SubCadsField;
	disabled: SubCadsField[] = [];
	cadDisabled = false;
	partnersDisabled = false;
	componentsDisabled = false;
	needsReload: Nullable<CadStatus["name"]>;
	@ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;
	@ViewChild("dxfInut", {read: ElementRef}) dxfInut?: ElementRef<HTMLElement>;
	contextMenuCad?: {field: SubCadsField; data: CadData};
	private _prevId = "";
	private lastPointer?: Point;
	private entitiesToMove?: CadEntities;
	private entitiesNotToMove?: CadEntities;
	private updateListLock = false;

	get selected() {
		const cads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const partners = this.partners.filter((v) => v.checked).map((v) => v.data);
		const components = this.components.filter((v) => v.checked).map((v) => v.data);
		return {cads, partners, components};
	}

	private splitCad = (async ({key}: KeyboardEvent) => {
		if (key !== "Enter") {
			return;
		}
		const {name, extra} = this.status.cadStatus$.getValue();
		if (name !== "split") {
			return;
		}
		const cad = this.status.cad;
		const entities = cad.selected();
		if (entities.length < 1) {
			return;
		}
		const data = cad.data.findChild(this._prevId);
		if (!data) {
			return;
		}
		const cloneData = data.clone(true);
		const collection = extra.collection as CadCollection;
		const split = new CadData();
		split.entities = entities.clone(true);
		const node = await this._getCadNode(split);
		this.cads.push(node);
		if (collection === "p_yuanshicadwenjian") {
			data.addComponent(split);
		} else {
			// data.separate(split);
			data.addComponent(split);
			this.blur(split.entities);
			cad.remove(entities);
			split.conditions = cloneData.conditions;
			split.options = cloneData.options;
			split.type = cloneData.type;
			try {
				data.directAssemble(split);
			} catch (error) {
				this.snackBar.open("快速装配失败: " + (error as Error).message);
			}
		}
	}).bind(this);

	private onPointerDown = ((event: PointerEvent) => {
		const {clientX, clientY, shiftKey, button} = event;
		if (this.config.config("dragAxis") !== "" || (button !== 1 && !(shiftKey && button === 0))) {
			return;
		}
		this.lastPointer = new Point(clientX, clientY);
		this.entitiesToMove = new CadEntities();
		this.entitiesNotToMove = new CadEntities();
		const selectedCads = this.status.getFlatSelectedCads();
		selectedCads.forEach((v) => this.entitiesToMove?.merge(v.getAllEntities()));
		const ids: string[] = [];
		this.entitiesToMove.forEach((e) => ids.push(e.id));
		this.status.cad.data.getAllEntities().forEach((e) => {
			if (!ids.includes(e.id)) {
				this.entitiesNotToMove?.add(e);
			}
		});
	}).bind(this);

	private onPointerMove = ((event: PointerEvent) => {
		if (!this.lastPointer) {
			return;
		}
		const {clientX, clientY} = event;
		const cad = this.status.cad;
		const selectedCads = this.status.selectedCads$.getValue();
		const name = this.status.cadStatus("name");
		const pointer = new Point(clientX, clientY);
		const translate = this.lastPointer.sub(pointer).divide(cad.zoom());
		translate.x = -translate.x;
		if (name === "assemble") {
			if (selectedCads.components.length) {
				const parent = cad.data.findChild(selectedCads.cads[0]);
				const data = cad.data.findChildren(selectedCads.components);
				if (parent) {
					data.forEach((v) => parent.moveComponent(v, translate));
				}
			} else {
				const data = cad.data.findChildren(selectedCads.cads);
				data.forEach((v) => v.transform({translate: translate.toArray()}));
			}
			cad.render();
		} else if (this.entitiesToMove && this.entitiesNotToMove) {
			cad.moveEntities(this.entitiesToMove, this.entitiesNotToMove, translate.x, translate.y);
		}
		this.lastPointer.copy(pointer);
	}).bind(this);

	private onPointerUp = (() => {
		delete this.lastPointer;
	}).bind(this);

	constructor(
		private sanitizer: DomSanitizer,
		private snackBar: MatSnackBar,
		private config: AppConfigService,
		private status: AppStatusService,
		private dialog: MatDialog,
		private message: MessageService,
		private dataService: CadDataService
	) {
		super();
	}

	ngOnInit() {
		this.subscribe(this.status.openCad$, () => this.updateList());
		this.subscribe(this.status.cadStatus$, () => this.updateCad());
		this.subscribe(this.status.selectedCads$, () => this.updateCad());
		// this.status.cad.on("render", debounce((() => this.updateList()).bind(this), 1000));

		const cad = this.status.cad;
		cad.on("pointerdown", this.onPointerDown);
		cad.on("pointermove", this.onPointerMove);
		cad.on("pointerup", this.onPointerUp);
		window.addEventListener("keydown", this.splitCad);
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		const cad = this.status.cad;
		cad.off("pointerdown", this.onPointerDown);
		cad.off("pointermove", this.onPointerMove);
		cad.off("pointerup", this.onPointerUp);
		window.removeEventListener("keydown", this.splitCad);
	}

	private async _getCadNode(data: CadData, parent?: string) {
		const img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(data)) as string;
		const node: CadNode = {data, img, checked: false, indeterminate: false, parent};
		await timeout(0);
		return node;
	}

	private focus(entities = this.status.cad.data.getAllEntities()) {
		entities.forEach((e) => {
			e.selectable = !e.info.isCadGongshi && !(e instanceof CadHatch);
			e.selected = false;
			e.opacity = 1;
		});
	}

	private blur(entities = this.status.cad.data.getAllEntities()) {
		entities.forEach((e) => {
			e.selectable = false;
			e.selected = false;
			e.opacity = 0.3;
		});
	}

	toggleMultiSelect() {
		this.multiSelect = !this.multiSelect;
		if (!this.multiSelect) {
			this.unselectAll();
		}
	}

	selectAll(field: SubCadsField = "cads", sync = true) {
		this[field].forEach((_v, i) => this.clickCad(field, i, true, false));
		if (sync) {
			this.setSelectedCads();
		}
	}

	unselectAll(field: SubCadsField = "cads", sync = true) {
		this[field].forEach((_v, i) => this.clickCad(field, i, false, false));
		if (sync) {
			this.setSelectedCads();
		}
	}

	clickCad(field: SubCadsField, index: number, event?: MatCheckboxChange | boolean | null, sync = true) {
		if (this.disabled.includes(field)) {
			return;
		}
		const cad = this[field][index];
		let checked: boolean;
		if (event instanceof MatCheckboxChange) {
			checked = event.checked;
		} else if (typeof event === "boolean") {
			checked = event;
		} else {
			checked = !cad.checked;
		}
		if (checked) {
			cad.indeterminate = false;
			if (!this.multiSelect) {
				this.unselectAll("cads", false);
			}
		}
		cad.checked = checked;
		if (field === "cads") {
			[...this.partners, ...this.components]
				.filter((v) => v.parent === cad.data.id)
				.forEach((v) => {
					v.checked = checked;
				});
		} else {
			const parent = this.cads.find((v) => v.data.id === cad.parent);
			if (parent) {
				if (parent.checked && !checked) {
					parent.checked = false;
					parent.indeterminate = true;
				}
				if (parent.indeterminate && checked) {
					parent.checked = true;
					parent.indeterminate = false;
				}
			}
		}
		if (sync) {
			this.setSelectedCads();
		}
	}

	setSelectedCads() {
		const selectedCads: SelectedCads = {cads: [], partners: [], components: [], fullCads: []};
		this.cads.forEach((v) => {
			if (v.checked || v.indeterminate) {
				selectedCads.cads.push(v.data.id);
			}
			if (v.checked) {
				selectedCads.fullCads.push(v.data.id);
			}
		});
		this.partners.forEach((v) => {
			if (v.checked) {
				selectedCads.partners.push(v.data.id);
			}
		});
		this.components.forEach((v) => {
			if (v.checked || v.indeterminate) {
				selectedCads.components.push(v.data.id);
			}
		});
		this.status.selectedCads$.next(selectedCads);
	}

	async updateList(list?: CadData[], sync = true, split = false) {
		if (this.updateListLock) {
			return;
		}
		this.updateListLock = true;
		const cad = this.status.cad;
		if (!list) {
			list = cad.data.components.data;
		}
		const {name} = this.status.cadStatus$.getValue();
		if (!split && name === "split") {
			this.updateListLock = false;
			await this.updateList([], sync, true);
			const data = cad.data.findChild(this._prevId);
			if (data) {
				for (const v of data.components.data) {
					const node = await this._getCadNode(v);
					this.cads.push(node);
					this.blur(v.getAllEntities());
				}
				cad.render();
			}
			return;
		}
		this.cads = [];
		this.partners = [];
		this.components = [];
		for (const d of list) {
			const node = await this._getCadNode(d);
			this.cads.push(node);
			for (const dd of d.partners) {
				const node = await this._getCadNode(dd, d.id);
				this.partners.push(node);
			}
			for (const dd of d.components.data) {
				const node = await this._getCadNode(dd, d.id);
				this.components.push(node);
			}
		}
		if (this.cads.length) {
			this.clickCad("cads", 0);
		}
		if (sync) {
			this.setSelectedCads();
		}
		this.updateListLock = false;
	}

	onContextMenu(event: MouseEvent, data: CadData, field: SubCadsField) {
		super.onContextMenu(event);
		if (this.disabled.includes(field)) {
			return;
		}
		this.contextMenuCad = {field, data};
	}

	async editChildren(type: "partners" | "components") {
		if (!this.contextMenuCad) {
			return;
		}
		const data = this.contextMenuCad.data;
		let checkedItems: CadData[] = [];
		if (type === "partners") {
			checkedItems = [...data.partners];
		}
		if (type === "components") {
			checkedItems = [...data.components.data];
		}
		const qiliao = type === "components" && this.config.config("collection") === "qiliaozuhe";
		let cads = await openCadListDialog(this.dialog, {
			data: {selectMode: "multiple", checkedItems, options: data.options, collection: "cad", qiliao}
		});
		if (Array.isArray(cads)) {
			const cad = this.status.cad;
			cads = cads.map((v) => v.clone(true));
			if (type === "partners") {
				data.partners = cads;
				cads.forEach((v) => data.addPartner(v));
			}
			if (type === "components") {
				data.components.data = cads;
				cads.forEach((v) => data.addComponent(v));
			}
			cad.data.updatePartners().updateComponents();
			await this.updateList();
			cad.reset();
		}
	}

	downloadDxf() {
		if (!this.contextMenuCad) {
			return;
		}
		const data = this.contextMenuCad.data.clone();
		removeCadGongshi(data);
		this.dataService.downloadDxf(data);
	}

	uploadDxf(mainCad = false) {
		if (!this.dxfInut) {
			return;
		}
		const el = this.dxfInut.nativeElement;
		el.click();
		if (mainCad) {
			el.setAttribute("main-cad", "");
		} else {
			el.removeAttribute("main-cad");
		}
	}

	async onDxfInutChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!this.contextMenuCad || !file) {
			return;
		}
		const data = this.contextMenuCad.data;
		const content = `确定要上传<span style="color:red">${file.name}</span>并替换<span style="color:red">${data.name}</span>的数据吗？`;
		const yes = await this.message.alert(content);
		if (yes) {
			const resData = await this.dataService.uploadDxf(file);
			if (resData) {
				if (input.hasAttribute("main-cad")) {
					const data1 = new CadData();
					data1.entities = data.entities;
					const data2 = new CadData();
					data2.entities = resData.entities;
					const {min: min1} = data1.getBoundingRect();
					const {min: min2} = data2.getBoundingRect();
					data2.transform({translate: min1.sub(min2)});
					data.entities = data2.entities;
				} else {
					data.entities = resData.entities;
					data.partners = resData.partners;
					data.components = resData.components;
				}
				this.updateList();
				this.status.cad.reset();
			}
		}
		input.value = "";
	}

	getJson() {
		if (!this.contextMenuCad) {
			return;
		}
		const data = this.contextMenuCad.data.clone();
		removeCadGongshi(data);
		copyToClipboard(JSON.stringify(data.export()));
		this.snackBar.open("内容已复制");
		console.log(data);
	}

	async setJson() {
		if (!this.contextMenuCad) {
			return;
		}
		let data = this.contextMenuCad.data.clone();
		removeCadGongshi(data);
		const ref = openJsonEditorDialog(this.dialog, {data: {json: data.export()}});
		const result = await ref.afterClosed().toPromise();
		if (result) {
			data = new CadData(result);
			addCadGongshi(data);
			this.contextMenuCad.data.copy(data);
			this.updateList();
			this.status.cad.reset();
		}
	}

	async deleteSelected() {
		const checkedCads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const checkedIds = checkedCads.map((v) => v.id);
		const {name, extra} = this.status.cadStatus$.getValue();
		const cad = this.status.cad;
		if (name === "split") {
			const collection = extra.collection as CadCollection;
			if (collection !== "p_yuanshicadwenjian") {
				const data = cad.data.findChild(this._prevId);
				if (data) {
					checkedCads.forEach((v) => {
						data.entities.merge(v.getAllEntities());
					});
					data.components.data = data.components.data.filter((v) => !checkedIds.includes(v.id));
				}
			}
			this.cads = this.cads.filter((v) => !v.checked);
			cad.render();
		} else {
			const data = cad.data;
			data.components.data = data.components.data.filter((v) => !checkedIds.includes(v.id));
			const toRemove: {[key: string]: {p: string[]; c: string[]}} = {};
			this.partners.forEach((v) => {
				if (v.parent && !checkedIds.includes(v.parent) && v.checked) {
					if (!toRemove[v.parent]) {
						toRemove[v.parent] = {p: [], c: []};
					}
					toRemove[v.parent].p.push(v.data.id);
				}
			});
			this.components.forEach((v) => {
				if (v.parent && !checkedIds.includes(v.parent) && v.checked) {
					if (!toRemove[v.parent]) {
						toRemove[v.parent] = {p: [], c: []};
					}
					toRemove[v.parent].c.push(v.data.id);
				}
			});
			if (checkedIds.length || Object.keys(toRemove).length) {
				for (const id in toRemove) {
					const {p, c} = toRemove[id];
					const parent = data.components.data.find((v) => v.id === id);
					if (parent) {
						parent.partners = parent.partners.filter((v) => !p.includes(v.id));
						parent.components.data = parent.components.data.filter((v) => !c.includes(v.id));
					}
				}
				this.updateList();
				cad.reset();
				this.setSelectedCads();
			}
		}
	}

	editSelected() {
		const selected = this.selected;
		let ids = [];
		if (selected.cads.length) {
			ids = selected.cads.map((v) => v.id);
		} else {
			ids = selected.partners.concat(selected.components).map((v) => v.id);
		}
		if (ids.length) {
			open("index?data=" + RSAEncrypt({ids}));
		}
	}

	async replaceData() {
		if (!this.contextMenuCad) {
			return;
		}
		const data = this.contextMenuCad.data;
		const cads = await openCadListDialog(this.dialog, {data: {selectMode: "single", options: data.options, collection: "cad"}});
		if (cads && cads[0]) {
			this.dataService.replaceData(data, cads[0].id);
		}
	}

	async updateCad() {
		const {name, index} = this.status.cadStatus();
		const {cads, partners, components} = this.status.selectedCads$.getValue();
		const cad = this.status.cad;
		const count = cads.length + partners.length + components.length;
		if (this.needsReload && this.needsReload !== name) {
			if (this.needsReload === "assemble") {
				cad.data.getAllEntities().mtext.forEach((e) => {
					if (e.info.isCadGongshi) {
						e.visible = true;
					}
				});
			}
			if (this.needsReload === "split") {
				if (this.config.config("collection") === "p_yuanshicadwenjian" && this._prevId) {
					const data = cad.data.findChild(this._prevId);
					if (data) {
						data.components.data = [];
						cad.reset();
					}
				}
				this._prevId = "";
				await this.updateList();
			}
			this.needsReload = null;
			this.disabled = [];
		}
		if (name === "normal") {
			if (count === 0) {
				this.focus();
				this.config.config("dragAxis", "xy");
			} else {
				this.blur();
				this.config.config("dragAxis", "");
				this.cads.forEach((v) => {
					v.data.show();
					if (cads.includes(v.data.id)) {
						this.focus(v.data.entities);
					}
				});
				this.partners.forEach((v) => {
					if (partners.includes(v.data.id)) {
						this.focus(v.data.getAllEntities());
					}
				});
				this.components.forEach((v) => {
					if (components.includes(v.data.id)) {
						this.focus(v.data.getAllEntities());
					}
				});
			}
		} else if (name === "selectBaseline") {
		} else if (name === "selectJointpoint") {
		} else if (name === "editDimension") {
			if (this.needsReload !== "editDimension") {
				this.saveStatus();
				this.unselectAll();
				this.disabled = ["cads", "components", "partners"];
				this.needsReload = "editDimension";
			}
		} else if (name === "assemble") {
			if (this.needsReload !== "assemble") {
				this.saveStatus();
				this.unselectAll("cads", false);
				this.clickCad("cads", index, null, false);
				this.unselectAll("components", false);
				this.setSelectedCads();
				this.disabled = ["cads", "partners"];
				this.needsReload = "assemble";
				cad.data.getAllEntities().mtext.forEach((e) => {
					if (e.info.isCadGongshi) {
						e.visible = false;
					}
				});
			}
			cad.data.components.data.forEach((v, i) => {
				if (i === index) {
					if (components.length) {
						this.blur(v.getAllEntities());
						v.findChildren(components).forEach((vv) => this.focus(vv.getAllEntities()));
					} else {
						this.focus(v.getAllEntities());
					}
				} else {
					this.blur(v.getAllEntities());
				}
			});
		} else if (name === "split") {
			cad.config("dragAxis", "xy");
			if (this.needsReload !== "split") {
				this.saveStatus();
				this.disabled = ["components", "partners"];
				this.needsReload = "split";
				this.updateList();
				this._prevId = cads[0];
			}
		}
		cad.render();
	}

	saveStatus() {
		const data: {[key: string]: number[]} = {};
		["cads", "partners", "components"].forEach((v) => {
			data[v] = [];
			((this as any)[v] as CadNode[]).forEach((vv, ii) => {
				if (vv.checked) {
					data[v].push(ii);
				}
			});
		});
		session.save("subCads", data);
	}

	loadStatus() {
		const data: {[key: string]: number[]} = session.load("subCads");
		for (const field in data) {
			data[field].forEach((i) => {
				const node = (this as any)[field][i] as CadNode;
				if (node) {
					node.checked = true;
				}
			});
		}
		this.setSelectedCads();
	}
}
