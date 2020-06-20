import {Component, OnInit, Input, ViewChild} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {Store} from "@ngrx/store";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadDataService} from "@src/app/services/cad-data.service";
import {timeout} from "@src/app/app.common";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {CurrCadsAction} from "@src/app/store/actions";
import {RSAEncrypt} from "@lucilor/utils";
import {State} from "@src/app/store/state";
import {MenuComponent} from "../menu.component";
import {CadListComponent} from "../../cad-list/cad-list.component";

interface CadNode {
	data: CadData;
	img: string;
	checked: boolean;
	indeterminate: boolean;
	parent?: string;
}

type LeftMenuField = "cads" | "partners" | "components";

@Component({
	selector: "app-sub-cads",
	templateUrl: "./sub-cads.component.html",
	styleUrls: ["./sub-cads.component.scss"]
})
export class SubCadsComponent extends MenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	@Input() cadStatus: State["cadStatus"];
	cads: CadNode[] = [];
	partners: CadNode[] = [];
	components: CadNode[] = [];
	multiSelect = true;
	checkedIndex = -1;
	field: LeftMenuField;
	disabled = false;
	@ViewChild(MatMenuTrigger) contextMenu: MatMenuTrigger;
	contextMenuCad: {isChild: boolean; data: CadData};
	get selected() {
		const cads = this.cads.filter((v) => v.checked).map((v) => v.data);
		const partners = this.partners.filter((v) => v.checked).map((v) => v.data);
		const components = this.components.filter((v) => v.checked).map((v) => v.data);
		return {cads, partners, components};
	}

	constructor(private store: Store<State>, private dialog: MatDialog, private dataService: CadDataService) {
		super(false);
	}

	ngOnInit() {}

	private async _getCadNode(data: CadData, parent?: string) {
		const cad = new CadViewer(data, {width: 200, height: 100, padding: 10});
		const node: CadNode = {data, img: cad.exportImage().src, checked: false, indeterminate: false, parent};
		cad.destroy();
		await timeout(0);
		return node;
	}

	async update() {
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
	}

	toggleMultiSelect() {
		this.multiSelect = !this.multiSelect;
		if (!this.multiSelect) {
			this.unselectAll();
		}
	}

	selectAll(field: LeftMenuField = null, sync = true) {
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

	unselectAll(field: LeftMenuField = null, sync = true) {
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

	clickCad(field: LeftMenuField, index: number, event?: MatCheckboxChange) {
		if (this.disabled) {
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
			}
		}
		this.setCurrCads();
	}

	setCurrCads() {
		if (this.disabled) {
			return;
		}
		const cads: State["currCads"] = {};
		this.cads.forEach((v) => {
			cads[v.data.id] = {self: v.checked, full: false, partners: [], components: []};
		});
		this.partners.forEach((v) => {
			if (v.checked) {
				cads[v.parent].partners.push(v.data.id);
			}
		});
		this.components.forEach((v) => {
			if (v.checked) {
				cads[v.parent].components.push(v.data.id);
			}
		});
		this.cads.forEach((v) => {
			const cad = cads[v.data.id];
			const fullPartners = cad.partners.length === v.data.partners.length;
			const fullComponents = cad.components.length === v.data.components.data.length;
			cad.full = fullPartners && fullComponents;
			v.indeterminate = !cad.full && cad.self;
		});
		this.store.dispatch<CurrCadsAction>({type: "set curr cads", cads});
	}

	onContextMenu(event: PointerEvent, data: CadData, isChild: boolean) {
		if (this.disabled) {
			return;
		}
		super.onContextMenu(event);
		this.contextMenuCad = {isChild, data};
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
				this.update();
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
			this.update();
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
