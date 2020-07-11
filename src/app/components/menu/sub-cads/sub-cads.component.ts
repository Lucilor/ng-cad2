import {Component, OnInit, ViewChild, OnDestroy, Injector} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatDialogRef} from "@angular/material/dialog";
import {timeout, Collection, session, copyToClipboard, removeCadGongshi, getCollection} from "@src/app/app.common";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {CurrCadsAction} from "@src/app/store/actions";
import {RSAEncrypt} from "@lucilor/utils";
import {State} from "@src/app/store/state";
import {MenuComponent} from "../menu.component";
import {CadListComponent} from "../../cad-list/cad-list.component";
import {takeUntil} from "rxjs/operators";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";
import {Vector2} from "three";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {getCurrCadsData} from "@src/app/store/selectors";
import {MatSnackBar} from "@angular/material/snack-bar";

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
	contextMenuCad: {field: SubCadsField; data: CadData};
	private _prevId = "";
	get selected() {
		const cads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const partners = this.partners.filter((v) => v.checked).map((v) => v.data);
		const components = this.components.filter((v) => v.checked).map((v) => v.data);
		return {cads, partners, components};
	}

	constructor(injector: Injector, private snackBar: MatSnackBar) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.currCads.pipe(takeUntil(this.destroyed)).subscribe(() => {
			this.updateCad();
		});
		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe(() => {
			this.updateCad();
		});

		let lastPointer: Vector2 = null;
		const cad = this.cad;
		const controls = cad.controls;
		controls.on("dragstart", ({clientX, clientY, shiftKey, button}) => {
			if (controls.config.dragAxis === "" && (button === 1 || (shiftKey && button === 0))) {
				lastPointer = new Vector2(clientX, clientY);
			}
		});
		controls.on("drag", async ({clientX, clientY}) => {
			if (lastPointer) {
				const currCads = await this.getCurrCads();
				const currCadsData = getCurrCadsData(this.cad.data, currCads);
				const {name} = await this.getCadStatus();
				const pointer = new Vector2(clientX, clientY);
				const translate = lastPointer.sub(pointer).divideScalar(cad.scale);
				translate.x = -translate.x;
				if (name === "assemble") {
					if (currCads.components.length) {
						const parent = cad.data.findChild(currCads.cads[0]);
						const data = cad.data.findChildren(currCads.components);
						data.forEach((v) => parent.moveComponent(v, translate));
					} else {
						const data = cad.data.findChildren(currCads.cads);
						data.forEach((v) => v.transform(new CadTransformation({translate})));
					}
				} else {
					currCadsData.forEach((v) => v.transform(new CadTransformation({translate})));
				}
				cad.render();
				lastPointer.copy(pointer);
			}
		});
		controls.on("dragend", () => {
			lastPointer = null;
		});

		window.addEventListener("keydown", this.splitCad.bind(this));
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		window.removeEventListener("keydown", this.splitCad);
	}

	private async _getCadNode(data: CadData, parent?: string) {
		const cad = new CadViewer(new CadData(data.export()), {width: 200, height: 100, padding: 10});
		const img = cad.exportImage().src;
		const node: CadNode = {data, img, checked: false, indeterminate: false, parent};
		cad.destroy();
		await timeout(0);
		return node;
	}

	private async splitCad({key}: KeyboardEvent) {
		if (key !== "Enter") {
			return;
		}
		const cad = this.cad;
		const data = cad.data.findChild(this._prevId);
		const {name, extra} = await this.getCadStatus();
		if (name === "split") {
			const collection = extra.collection as Collection;
			const split = new CadData();
			const entities = cad.selectedEntities;
			split.entities = entities.clone(true);
			const node = await this._getCadNode(split);
			this.cads.push(node);
			if (collection === "p_yuanshicadwenjian") {
				data.addComponent(split);
			} else {
				data.separate(split);
				data.addComponent(split);
				split.conditions = data.conditions;
				split.options = data.options;
				split.type = data.type;
				try {
					data.directAssemble(split);
				} catch (error) {
					this.snackBar.open("快速装配失败: " + (error as Error).message);
				}
				cad.removeEntities(entities);
				this.blur(split.entities);
			}
			cad.unselectAll();
		}
	}

	private focus(entities?: CadEntities) {
		this.cad.traverse((e) => {
			e.selectable = !e.info.isCadGongshi;
			e.selected = false;
			e.opacity = 1;
		}, entities);
	}

	private blur(entities?: CadEntities) {
		this.cad.traverse((e) => {
			e.selectable = false;
			e.selected = false;
			e.opacity = 0.3;
		}, entities);
	}

	async updateCad() {
		const {name, index} = await this.getCadStatus();
		const {cads, partners, components} = await this.getCurrCads();
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
				if (getCollection() === "p_yuanshicadwenjian") {
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
			cad.controls.config.selectMode = "multiple";
			if (count === 0) {
				this.focus();
				cad.controls.config.dragAxis = "xy";
			} else {
				this.blur();
				cad.controls.config.dragAxis = "";
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
			cad.controls.config.dragAxis = "xy";
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
		const {name} = await this.getCadStatus();
		if (!split && name === "split") {
			await this.updateList([], sync, true);
			const data = this.cad.data.findChild(this._prevId);
			for (const v of data.components.data) {
				const node = await this._getCadNode(v.clone(true));
				this.cads.push(node);
				this.blur(v.getAllEntities());
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
		const qiliao = type === "components" && getCollection() === "qiliaozuhe";
		const ref: MatDialogRef<CadListComponent, CadData[]> = this.dialog.open(CadListComponent, {
			data: {selectMode: "multiple", checkedItems, options: data.options, collection: "cad", qiliao}
		});
		ref.afterClosed().subscribe(async (cads) => {
			if (Array.isArray(cads)) {
				cads = cads.map((v) => v.clone(true));
				if (type === "partners") {
					cads.forEach((v) => data.addPartner(v));
				}
				if (type === "components") {
					cads.forEach((v) => data.addComponent(v));
				}
				this.cad.data.updatePartners().updateComponents();
				this.updateList();
			}
		});
	}

	downloadDxf() {
		removeCadGongshi(this.contextMenuCad.data.clone());
		this.dataService.downloadDxf(this.contextMenuCad.data);
	}

	getJson() {
		const data = this.contextMenuCad.data;
		copyToClipboard(JSON.stringify(data.export()));
		this.snackBar.open("内容已复制");
		console.log(data);
	}

	async deleteSelected() {
		const checkedCads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const checkedIds = checkedCads.map((v) => v.id);
		const {name, extra} = await this.getCadStatus();
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
		const ref = this.dialog.open(CadListComponent, {
			data: {selectMode: "single", options: data.options, collection: "cad"},
			width: "80vw"
		});
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
