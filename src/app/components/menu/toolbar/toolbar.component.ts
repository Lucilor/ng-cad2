import {Component, OnInit, Input, Output, EventEmitter} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadDataService} from "@src/app/services/cad-data.service";
import {Store} from "@ngrx/store";
import {CurrCadsAction, CadStatusAction} from "@src/app/store/actions";
import {RSAEncrypt} from "@lucilor/utils";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {State} from "@src/app/store/state";
import {MenuComponent} from "../menu.component";
import {MessageComponent} from "../../message/message.component";
import {CadListComponent} from "../../cad-list/cad-list.component";
import {Observable} from "rxjs";
import {getCadStatus} from "@src/app/store/selectors";
import {take} from "rxjs/operators";

@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent extends MenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	@Output() openCad = new EventEmitter<CadData[]>();
	cadStatus: Observable<State["cadStatus"]>;
	canSave = true;
	collection: string;
	ids: string[];
	openLock = false;
	keyMap: {[key: string]: () => void} = {
		s: () => this.save(),
		1: () => this.open("p_yuanshicadwenjian"),
		2: () => this.open("cad"),
		3: () => this.open("cadmuban"),
		4: () => this.open("qiliaozuhe"),
		5: () => this.open("qieliaocad"),
		g: () => this.assemble()
	};

	constructor(private dialog: MatDialog, private dataService: CadDataService, private store: Store<State>) {
		super();
	}

	async ngOnInit() {
		window.addEventListener("keydown", (event) => {
			const {key, ctrlKey} = event;
			if (ctrlKey) {
				event.preventDefault();
				this.clickBtn(key);
			}
		});
		if (this.dataService.data) {
			const data = await this.dataService.getCadData(this.dataService.data);
			this.openCad.emit(data);
		} else {
			const {ids, collection} = this;
			if (ids.length) {
				this.canSave = this.collection !== "p_yuanshicadwenjian";
				const data = await this.dataService.getCadData({ids, collection});
				this.openCad.emit(data);
			} else {
				this.canSave = this.cad.data.components.data.length > 0;
			}
		}
		this.cadStatus = this.store.select(getCadStatus);
	}

	clickBtn(key: string) {
		this.keyMap[key]?.();
	}

	open(collection: string) {
		if (this.openLock) {
			return;
		}
		if (collection === "p_yuanshicadwenjian") {
			this.dialog.open(MessageComponent, {data: {type: "alert", content: "暂未支持"}});
			return;
		}
		const selectMode = collection === "p_yuanshicadwenjian" ? "table" : "multiple";
		const ref: MatDialogRef<CadListComponent, CadData[]> = this.dialog.open(CadListComponent, {
			data: {type: collection, selectMode, checkedItems: this.cad.data.components.data}
		});
		this.openLock = true;
		ref.afterClosed().subscribe((data) => {
			if (data) {
				this.collection = collection;
				this.openCad.emit(data);
				this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
			}
			this.openLock = false;
		});
	}

	async save() {
		if (this.canSave) {
			const {cad, dataService, collection} = this;
			const response = await dataService.postCadData(cad.data.components.data, RSAEncrypt({collection}));
			console.log(response);
		}
	}

	flip(event: PointerEvent, vertical: boolean, horizontal: boolean) {
		event.stopPropagation();
		this.transform(new CadTransformation({flip: {vertical, horizontal}}));
	}

	async rotate(event: PointerEvent, clockwise?: boolean) {
		event.stopPropagation();
		let angle = 0;
		if (clockwise === undefined) {
			const ref = this.dialog.open(MessageComponent, {data: {type: "prompt", title: "输入角度"}});
			const input = await ref.afterClosed().toPromise();
			if (input === false) {
				return;
			}
			angle = Number(input);
			if (isNaN(angle)) {
				this.dialog.open(MessageComponent, {data: {type: "alert", content: "请输入数字"}});
				return;
			}
		} else {
			if (clockwise === true) {
				angle = Math.PI / 2;
			} else if (clockwise === false) {
				angle = -Math.PI / 2;
			}
		}
		this.transform(new CadTransformation({rotate: {angle}}), typeof clockwise === "boolean");
	}

	transform(trans: CadTransformation, rotateDimension = false) {
		const {cad} = this;
		const seleted = cad.selectedEntities;
		if (seleted.length) {
			const {x, y} = seleted.getBounds();
			trans.anchor.set(x, y);
			seleted.transform(trans);
		} else {
			const t = (data: CadData) => {
				const {x, y} = data.getAllEntities().getBounds();
				trans.anchor.set(x, y);
				data.transform(trans);
				if (rotateDimension) {
					data.getAllEntities().dimension.forEach((d) => {
						if (d.axis === "x") {
							d.axis = "y";
						} else {
							d.axis = "x";
						}
					});
				}
			};
			if (this.currCads.length) {
				this.currCads.forEach((data) => t(data));
			} else {
				this.cad.data.components.data.forEach((data) => t(data));
			}
		}
		cad.data.updatePartners().updateComponents();
		cad.render();
	}

	showHelpInfo() {
		this.dialog.open(MessageComponent, {
			data: {type: "alert", title: "帮助信息", content: "..."}
		});
	}

	async assemble() {
		const ids = this.currCads.map((v) => v.id);
		const selected = {names: [], indices: []};
		this.cad.data.components.data.forEach((v, i) => {
			if (ids.includes(v.id)) {
				selected.names.push(v.name);
				selected.indices.push(i);
			}
		});
		if (selected.indices.length < 1) {
			this.dialog.open(MessageComponent, {data: {type: "alert", content: "请先选择一个CAD"}});
			return;
		} else if (selected.indices.length > 1) {
			const ref = this.dialog.open(MessageComponent, {
				data: {
					type: "confirm",
					content: `你选择了多个CAD。进入装配将自动选取<span style="color:red">${selected.names[0]}</span>来装配，是否继续？`
				}
			});
			const yes = await ref.afterClosed().toPromise();
			if (!yes) {
				return;
			}
		}
		const {name} = await this.cadStatus.pipe(take(1)).toPromise();
		if (name === "assemble") {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		} else {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "assemble", index: selected.indices[0]});
		}
	}

	saveStatus() {
		const data = {
			collection: this.collection,
			ids: this.cad.data.components.data.map((v) => v.id)
		};
		this.session.save("toolbar", data);
	}

	loadStatus() {
		const data = this.session.load("toolbar", true);
		this.collection = data.collection || "";
		this.ids = data.ids || [];
	}
}
