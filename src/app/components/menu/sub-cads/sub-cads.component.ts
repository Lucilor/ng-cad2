import {Component, OnInit, ViewChild, OnDestroy, Injector, ElementRef} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatMenuTrigger} from "@angular/material/menu";
import {
	timeout,
	Collection,
	session,
	copyToClipboard,
	removeCadGongshi,
	addCadGongshi,
	getCadPreview,
	globalVars
} from "@src/app/app.common";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {CurrCadsAction} from "@src/app/store/actions";
import {Point, RSAEncrypt} from "@app/utils";
import {State} from "@src/app/store/state";
import {MenuComponent} from "../menu.component";
import {openCadListDialog} from "../../cad-list/cad-list.component";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";
import {getCadStatus, getCurrCads} from "@src/app/store/selectors";
import {MatSnackBar} from "@angular/material/snack-bar";
import {openMessageDialog} from "../../message/message.component";
import {openJsonEditorDialog} from "../../json-editor/json-editor.component";
import {DomSanitizer} from "@angular/platform-browser";
import {CadHatch} from "@src/app/cad-viewer/cad-data/cad-entity";

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
export class SubCadsComponent extends MenuComponent implements OnInit, OnDestroy {
	cads: CadNode[] = [];
	partners: CadNode[] = [];
	components: CadNode[] = [];
	multiSelect = true;
	checkedIndex = -1;
	field: SubCadsField;
	disabled: SubCadsField[] = [];
	cadDisabled = false;
	partnersDisabled = false;
	componentsDisabled = false;
	needsReload: State["cadStatus"]["name"];
	@ViewChild(MatMenuTrigger) contextMenu: MatMenuTrigger;
	@ViewChild("dxfInut", {read: ElementRef}) dxfInut: ElementRef<HTMLElement>;
	contextMenuCad: {field: SubCadsField; data: CadData};
	private _prevId = "";

	get selected() {
		const cads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const partners = this.partners.filter((v) => v.checked).map((v) => v.data);
		const components = this.components.filter((v) => v.checked).map((v) => v.data);
		return {cads, partners, components};
	}

	constructor(injector: Injector, private snackBar: MatSnackBar, private sanitizer: DomSanitizer) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.getObservable(getCurrCads).subscribe(() => {
			this.updateCad();
		});
		this.getObservable(getCadStatus).subscribe(() => {
			this.updateCad();
		});

		let lastPointer: Point = null;
		const cad = this.cad;
		let entitiesToMove: CadEntities;
		let entitiesNotToMove: CadEntities;
		cad.on("pointerdown", async ({clientX, clientY, shiftKey, button}) => {
			if (cad.config("dragAxis") === "" && (button === 1 || (shiftKey && button === 0))) {
				lastPointer = new Point(clientX, clientY);
				entitiesToMove = new CadEntities();
				entitiesNotToMove = new CadEntities();
				const currCadsData = await this.getCurrCadsData();
				currCadsData.forEach((v) => entitiesToMove.merge(v.getAllEntities()));
				const ids = [];
				entitiesToMove.forEach((e) => ids.push(e.id));
				cad.data.getAllEntities().forEach((e) => {
					if (!ids.includes(e.id)) {
						entitiesNotToMove.add(e);
					}
				});
			}
		});
		cad.on("pointermove", async ({clientX, clientY}) => {
			if (lastPointer) {
				const currCads = await this.getObservableOnce(getCurrCads);
				const {name} = await this.getObservableOnce(getCadStatus);
				const pointer = new Point(clientX, clientY);
				const translate = lastPointer.sub(pointer).divide(cad.zoom());
				translate.x = -translate.x;
				if (name === "assemble") {
					if (currCads.components.length) {
						const parent = cad.data.findChild(currCads.cads[0]);
						const data = cad.data.findChildren(currCads.components);
						data.forEach((v) => parent.moveComponent(v, translate));
					} else {
						const data = cad.data.findChildren(currCads.cads);
						data.forEach((v) => v.transform({translate: translate.toArray()}));
					}
					cad.render();
				} else {
					cad.moveEntities(entitiesToMove, entitiesNotToMove, translate.x, translate.y);
				}
				lastPointer.copy(pointer);
			}
		});
		cad.on("pointerup", () => {
			lastPointer = null;
		});
		cad.on("open", () => this.updateList());

		window.addEventListener("keydown", this.splitCad.bind(this));
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		window.removeEventListener("keydown", this.splitCad);
	}

	private async _getCadNode(data: CadData, parent?: string) {
		const img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(data)) as string;
		const node: CadNode = {data, img, checked: false, indeterminate: false, parent};
		await timeout(0);
		return node;
	}

	private async splitCad({key}: KeyboardEvent) {
		if (key !== "Enter") {
			return;
		}
		const {name, extra} = await this.getObservableOnce(getCadStatus);
		if (name !== "split") {
			return;
		}
		const cad = this.cad;
		const entities = cad.selected();
		if (entities.length < 1) {
			return;
		}
		const data = cad.data.findChild(this._prevId);
		const cloneData = data.clone(true);
		const collection = extra.collection as Collection;
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
	}

	private focus(entities = this.cad.data.getAllEntities()) {
		entities.forEach((e) => {
			e.selectable = !e.info.isCadGongshi && !(e instanceof CadHatch);
			e.selected = false;
			e.opacity = 1;
		});
	}

	private blur(entities = this.cad.data.getAllEntities()) {
		entities.forEach((e) => {
			e.selectable = false;
			e.selected = false;
			e.opacity = 0.3;
		});
	}

	async updateCad() {
		const {name, index} = await this.getObservableOnce(getCadStatus);
		const {cads, partners, components} = await this.getObservableOnce(getCurrCads);
		const {cad} = this;
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
				if (globalVars.collection === "p_yuanshicadwenjian" && this._prevId) {
					const data = cad.data.findChild(this._prevId);
					data.components.data = [];
					cad.reset();
				}
				this._prevId = null;
				await this.updateList();
			}
			this.loadStatus();
			this.needsReload = null;
			this.disabled = [];
		}
		if (name === "normal") {
			if (count === 0) {
				this.focus();
				cad.config("dragAxis", "xy");
			} else {
				this.blur();
				cad.config("dragAxis", "");
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
		} else if (name === "select baseline") {
		} else if (name === "select jointpoint") {
		} else if (name === "edit dimension") {
			if (this.needsReload !== "edit dimension") {
				this.saveStatus();
				this.unselectAll();
				this.disabled = ["cads", "components", "partners"];
				this.needsReload = "edit dimension";
			}
		} else if (name === "assemble") {
			if (this.needsReload !== "assemble") {
				this.saveStatus();
				this.unselectAll("cads", false);
				this.clickCad("cads", index, null, false);
				this.unselectAll("components", false);
				this.setCurrCads();
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

	async updateList(list = this.cad.data.components.data, sync = true, split = false) {
		const {name} = await this.getObservableOnce(getCadStatus);
		if (!split && name === "split") {
			await this.updateList([], sync, true);
			const data = this.cad.data.findChild(this._prevId);
			for (const v of data.components.data) {
				const node = await this._getCadNode(v);
				this.cads.push(node);
				this.blur(v.getAllEntities());
				this.cad.render();
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
			this.setCurrCads();
		}
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
			this.setCurrCads();
		}
	}

	unselectAll(field: SubCadsField = "cads", sync = true) {
		this[field].forEach((_v, i) => this.clickCad(field, i, false, false));
		if (sync) {
			this.setCurrCads();
		}
	}

	clickCad(field: SubCadsField, index: number, event?: MatCheckboxChange | boolean, sync = true) {
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
			if (parent.checked && !checked) {
				parent.checked = false;
				parent.indeterminate = true;
			}
			if (parent.indeterminate && checked) {
				parent.checked = true;
				parent.indeterminate = false;
			}
		}
		if (sync) {
			this.setCurrCads();
		}
	}

	async setCurrCads() {
		const currCads: State["currCads"] = {cads: [], partners: [], components: [], fullCads: []};
		this.cads.forEach((v) => {
			if (v.checked || v.indeterminate) {
				currCads.cads.push(v.data.id);
			}
			if (v.checked) {
				currCads.fullCads.push(v.data.id);
			}
		});
		this.partners.forEach((v) => {
			if (v.checked) {
				currCads.partners.push(v.data.id);
			}
		});
		this.components.forEach((v) => {
			if (v.checked || v.indeterminate) {
				currCads.components.push(v.data.id);
			}
		});
		this.store.dispatch<CurrCadsAction>({type: "set curr cads", cads: currCads});
	}

	onContextMenu(event: PointerEvent, data: CadData, field: SubCadsField) {
		if (this.disabled.includes(field)) {
			return;
		}
		super.onContextMenu(event);
		this.contextMenuCad = {field, data};
		this.contextMenu.openMenu();
	}

	editChildren(type: "partners" | "components") {
		const data = this.contextMenuCad.data;
		let checkedItems: CadData[];
		if (type === "partners") {
			checkedItems = [...data.partners];
		}
		if (type === "components") {
			checkedItems = [...data.components.data];
		}
		const qiliao = type === "components" && globalVars.collection === "qiliaozuhe";
		const ref = openCadListDialog(this.dialog, {
			data: {selectMode: "multiple", checkedItems, options: data.options, collection: "cad", qiliao}
		});
		ref.afterClosed().subscribe(async (cads) => {
			if (Array.isArray(cads)) {
				cads = cads.map((v) => v.clone(true));
				if (type === "partners") {
					data.partners = cads;
					cads.forEach((v) => data.addPartner(v));
				}
				if (type === "components") {
					data.components.data = cads;
					cads.forEach((v) => data.addComponent(v));
				}
				this.cad.data.updatePartners().updateComponents();
				await this.updateList();
				this.cad.reset();
			}
		});
	}

	downloadDxf() {
		const data = this.contextMenuCad.data.clone();
		removeCadGongshi(data);
		this.dataService.downloadDxf(data);
	}

	uploadDxf(mainCad = false) {
		const el = this.dxfInut.nativeElement;
		el.click();
		if (mainCad) {
			el.setAttribute("main-cad", "");
		} else {
			el.removeAttribute("main-cad");
		}
	}

	async onDxfInutChange(event: InputEvent) {
		const input = event.target as HTMLInputElement;
		const file = input.files[0];
		const data = this.contextMenuCad.data;
		const content = `确定要上传<span style="color:red">${file.name}</span>并替换<span style="color:red">${data.name}</span>的数据吗？`;
		const ref = openMessageDialog(this.dialog, {data: {type: "confirm", content}});
		const yes = await ref.afterClosed().toPromise();
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
				this.cad.reset();
			}
		}
		input.value = "";
	}

	getJson() {
		const data = this.contextMenuCad.data.clone();
		removeCadGongshi(data);
		copyToClipboard(JSON.stringify(data.export()));
		this.snackBar.open("内容已复制");
		console.log(data);
	}

	async setJson() {
		let data = this.contextMenuCad.data.clone();
		removeCadGongshi(data);
		const ref = openJsonEditorDialog(this.dialog, {data: {json: data.export()}});
		const result = await ref.afterClosed().toPromise();
		if (result) {
			data = new CadData(result);
			addCadGongshi(data);
			this.contextMenuCad.data.copy(data);
			this.updateList();
			this.cad.reset();
		}
	}

	async deleteSelected() {
		const checkedCads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const checkedIds = checkedCads.map((v) => v.id);
		const {name, extra} = await this.getObservableOnce(getCadStatus);
		if (name === "split") {
			const collection = extra.collection as Collection;
			if (collection !== "p_yuanshicadwenjian") {
				const data = this.cad.data.findChild(this._prevId);
				checkedCads.forEach((v) => {
					data.entities.merge(v.getAllEntities());
				});
				data.components.data = data.components.data.filter((v) => !checkedIds.includes(v.id));
			}
			this.cads = this.cads.filter((v) => !v.checked);
			this.cad.render();
		} else {
			const data = this.cad.data;
			data.components.data = data.components.data.filter((v) => !checkedIds.includes(v.id));
			const toRemove: {[key: string]: {p: string[]; c: string[]}} = {};
			this.partners.forEach((v) => {
				if (!checkedIds.includes(v.parent) && v.checked) {
					if (!toRemove[v.parent]) {
						toRemove[v.parent] = {p: [], c: []};
					}
					toRemove[v.parent].p.push(v.data.id);
				}
			});
			this.components.forEach((v) => {
				if (!checkedIds.includes(v.parent) && v.checked) {
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
					parent.partners = parent.partners.filter((v) => !p.includes(v.id));
					parent.components.data = parent.components.data.filter((v) => !c.includes(v.id));
				}
				this.updateList();
				this.cad.reset();
				this.setCurrCads();
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
		const data = this.contextMenuCad.data;
		const ref = openCadListDialog(this.dialog, {data: {selectMode: "single", options: data.options, collection: "cad"}});
		ref.afterClosed().subscribe((cads: CadData[]) => {
			if (cads && cads[0]) {
				this.dataService.replaceData(data, cads[0].id);
			}
		});
	}

	saveStatus() {
		const data: {[key: string]: number[]} = {};
		["cads", "partners", "components"].forEach((v) => {
			data[v] = [];
			(this[v] as CadNode[]).forEach((vv, ii) => {
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
				const node = this[field][i] as CadNode;
				if (node) {
					node.checked = true;
				}
			});
		}
		this.setCurrCads();
	}
}
