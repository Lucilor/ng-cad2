import {Component, OnInit, ViewChild, OnDestroy, Injector} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatDialogRef} from "@angular/material/dialog";
import {timeout} from "@src/app/app.common";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {CurrCadsAction} from "@src/app/store/actions";
import {RSAEncrypt} from "@lucilor/utils";
import {State} from "@src/app/store/state";
import {MenuComponent} from "../menu.component";
import {CadListComponent} from "../../cad-list/cad-list.component";
import {getCadStatus, getCurrCads} from "@src/app/store/selectors";
import {take, takeUntil} from "rxjs/operators";
import {Observable, Subject} from "rxjs";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";

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
	cadStatus: Observable<State["cadStatus"]>;
	currCads: Observable<State["currCads"]>;
	destroyed = new Subject();
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
	get selected() {
		const cads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const partners = this.partners.filter((v) => v.checked).map((v) => v.data);
		const components = this.components.filter((v) => v.checked).map((v) => v.data);
		return {cads, partners, components};
	}

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.currCads = this.store.select(getCurrCads);
		this.cadStatus = this.store.select(getCadStatus);
		this.currCads.pipe(takeUntil(this.destroyed)).subscribe(() => {
			this.updateCad();
		});
		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe(() => {
			this.updateCad();
		});
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		this.destroyed.next();
	}

	private async _getCadNode(data: CadData, parent?: string) {
		const cad = new CadViewer(data, {width: 200, height: 100, padding: 10});
		const node: CadNode = {data, img: cad.exportImage().src, checked: false, indeterminate: false, parent};
		cad.destroy();
		await timeout(0);
		return node;
	}

	private focus(entities?: CadEntities) {
		this.cad.traverse((o, e) => {
			o.userData.selectable = true;
			o.userData.selected = false;
			e.opacity = 1;
		}, entities);
	}

	private blur(entities?: CadEntities) {
		this.cad.traverse((o, e) => {
			o.userData.selectable = false;
			o.userData.selected = false;
			e.opacity = 0.3;
		}, entities);
	}

	async updateCad() {
		const {name, index} = await this.cadStatus.pipe(take(1)).toPromise();
		const {cads, partners, components} = await this.currCads.pipe(take(1)).toPromise();
		const {cad} = this;
		const count = cads.length + partners.length + components.length;
		if (this.needsReload && this.needsReload !== name) {
			this.loadStatus();
			this.needsReload = null;
			this.disabled = [];
		}
		if (name === "normal") {
			cad.controls.config.selectMode = "multiple";
			if (count === 0) {
				this.focus();
			} else {
				this.blur();
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
			if (!this.needsReload) {
				this.saveStatus();
				this.unselectAll();
				this.disabled = ["cads", "components", "partners"];
				this.needsReload = "edit dimension";
			}
		} else if (name === "assemble") {
			if (this.needsReload !== "assemble") {
				this.saveStatus();
				this.unselectAll(null, false);
				this.clickCad("cads", index);
				this.disabled = ["cads", "partners"];
				this.needsReload = "assemble";
			}
			cad.data.components.data.forEach((v, i) => {
				if (i === index) {
					v.show();
					// const ids = currCads.map((v) => v.id);
					// this.focus(v.getAllEntities());
					// if (ids[0] !== v.id) {
					// 	v.components.data.forEach((vv) => {
					// 		if (!ids.includes(vv.id)) {
					// 			this.blur(vv.getAllEntities());
					// 		}
					// 	});
					// }
				} else {
					v.hide();
				}
			});
		}
		cad.render();
	}

	async updateList() {
		this.cads = [];
		this.partners = [];
		this.components = [];
		const data = this.cad.data.components.data;
		for (const d of data) {
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
		this.setCurrCads();
	}

	toggleMultiSelect() {
		this.multiSelect = !this.multiSelect;
		if (!this.multiSelect) {
			this.unselectAll();
		}
	}

	selectAll(field: SubCadsField = null, sync = true) {
		if (this.disabled.includes(field)) {
			return;
		}
		let arr: CadNode[];
		if (field) {
			arr = this[field];
		} else {
			arr = [...this.cads, ...this.partners, ...this.components];
		}
		arr.forEach((v) => (v.checked = true));
		if (field === "cads") {
			[...this.partners, ...this.components].forEach((v) => {
				v.checked = true;
			});
		}
		if (sync) {
			this.setCurrCads();
		}
	}

	unselectAll(field: SubCadsField = null, sync = true) {
		if (this.disabled.includes(field)) {
			return;
		}
		let arr: CadNode[];
		if (field) {
			arr = this[field];
		} else {
			arr = [...this.cads, ...this.partners, ...this.components];
		}
		arr.forEach((v) => (v.checked = false));
		if (field === "cads") {
			[...this.partners, ...this.components].forEach((v) => {
				v.checked = false;
			});
		} else {
			this.cads.forEach((v) => (v.checked = false));
		}
		if (sync) {
			this.setCurrCads();
		}
	}

	clickCad(field: SubCadsField, index: number, event?: MatCheckboxChange) {
		if (this.disabled.includes(field)) {
			return;
		}
		const cad = this[field][index];
		const checked = event ? event.checked : !cad.checked;
		if (checked) {
			cad.indeterminate = false;
			if (!this.multiSelect) {
				this.unselectAll(null, false);
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
		this.setCurrCads();
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
		const ref: MatDialogRef<CadListComponent, CadData[]> = this.dialog.open(CadListComponent, {
			data: {selectMode: "multiple", checkedItems, options: data.options}
		});
		ref.afterClosed().subscribe(async (cads) => {
			if (Array.isArray(cads)) {
				cads = cads.map((v) => v.clone(true));
				if (type === "partners") {
					data.partners = cads;
				}
				if (type === "components") {
					data.components.data = cads;
				}
				this.cad.data.updatePartners().updateComponents();
				this.updateList();
			}
		});
	}

	downloadDxf() {
		this.dataService.downloadDxf(this.contextMenuCad.data);
	}

	deleteSelected() {
		const data = this.cad.data;
		const checkedCads = this.cads.filter((v) => v.checked).map((v) => v.data.id);
		data.components.data = data.components.data.filter((v) => !checkedCads.includes(v.id));
		const toRemove: {[key: string]: {p: string[]; c: string[]}} = {};
		this.partners.forEach((v) => {
			if (!checkedCads.includes(v.parent) && v.checked) {
				if (!toRemove[v.parent]) {
					toRemove[v.parent] = {p: [], c: []};
				}
				toRemove[v.parent].p.push(v.data.id);
			}
		});
		this.components.forEach((v) => {
			if (!checkedCads.includes(v.parent) && v.checked) {
				if (!toRemove[v.parent]) {
					toRemove[v.parent] = {p: [], c: []};
				}
				toRemove[v.parent].c.push(v.data.id);
			}
		});
		if (Object.keys(toRemove).length) {
			for (const id in toRemove) {
				const {p, c} = toRemove[id];
				const parent = data.components.data.find((v) => v.id === id);
				parent.partners = parent.partners.filter((v) => !p.includes(v.id));
				parent.components.data = parent.components.data.filter((v) => !c.includes(v.id));
			}
			this.updateList();
			this.cad.reset(null, false);
			this.setCurrCads();
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
		// const ids = this.currCads.map((v) => v.id);
		if (ids.length) {
			console.log(ids);
			open("index?data=" + RSAEncrypt({ids}));
		}
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
		this.session.save("subCads", data);
	}

	loadStatus() {
		const data: {[key: string]: number[]} = this.session.load("subCads", true);
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
