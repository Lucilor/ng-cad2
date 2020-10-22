import {Component, OnDestroy, Injector, Input, OnInit} from "@angular/core";
import {CadDataService} from "@app/services/cad-data.service";
import {Store} from "@ngrx/store";
import {State} from "@app/store/state";
import {MatDialog} from "@angular/material/dialog";
import {Subject} from "rxjs";
import {getCurrCads, getCurrCadsData} from "@app/store/selectors";
import {take, takeUntil} from "rxjs/operators";
import {addCadGongshi, Collection, globalVars} from "@app/app.common";
import {CadBaseLine, CadData, CadJointPoint, CadOption} from "@app/cad-viewer/cad-data/cad-data";
import {generateLineTexts, validateLines} from "@app/cad-viewer/cad-data/cad-lines";
import {CurrCadsAction, CadStatusAction} from "@app/store/actions";
import Color from "color";
import {NgxUiLoaderService} from "ngx-ui-loader";

@Component({
	selector: "app-menu",
	template: "",
	providers: [CadDataService, Store, MatDialog]
})
export class MenuComponent implements OnInit, OnDestroy {
	protected dataService: CadDataService;
	protected store: Store<State>;
	protected dialog: MatDialog;
	protected loader: NgxUiLoaderService;
	loaderId = "";
	loaderText = "";
	destroyed = new Subject();
	contextMenuPosition = {x: "0px", y: "0px"};

	get cad() {
		return globalVars.cad;
	}
	get collection() {
		return globalVars.collection;
	}

	constructor(injector: Injector) {
		this.dataService = injector.get(CadDataService);
		this.store = injector.get(Store);
		this.dialog = injector.get(MatDialog);
		this.loader = injector.get(NgxUiLoaderService);
	}

	ngOnInit() {
		this.loadStatus();
		window.addEventListener("beforeunload", () => this.saveStatus());
	}

	ngOnDestroy() {
		this.saveStatus();
		this.destroyed.next();
	}

	saveStatus() {}

	loadStatus() {}

	onContextMenu(event: PointerEvent, ..._args: any[]) {
		event.preventDefault();
		this.contextMenuPosition.x = event.clientX + "px";
		this.contextMenuPosition.y = event.clientY + "px";
	}

	async getCurrCadsData() {
		return getCurrCadsData(this.cad.data, await this.getObservableOnce(getCurrCads));
	}

	getObservable<T>(selector: (state: State) => T) {
		return this.store.select(selector).pipe(takeUntil(this.destroyed));
	}

	getObservableOnce<T>(selector: (state: State) => T) {
		return this.store.select(selector).pipe(take(1)).toPromise();
	}

	openCad(data?: CadData[], collection?: Collection) {
		const cad = globalVars.cad;
		if (data) {
			cad.data.components.data = data;
			cad.data.info.算料单 = data.some((v) => v.info.算料单);
			data.forEach((v) => {
				setCadData(v);
				addCadGongshi(v);
			});
			this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
		} else {
			data = cad.data.components.data;
			this.store.dispatch<CurrCadsAction>({type: "refresh curr cads"});
		}
		if (collection) {
			globalVars.collection = collection;
		} else {
			collection = globalVars.collection;
		}
		document.title = data.map((v) => v.name).join(", ");
		if (collection === "cad") {
			data.forEach((v) => validateLines(v));
		}
		cad.reset().emit("open");
		setTimeout(() => cad.center(), 1000);
		this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
	}

	generateLineTexts() {
		const {collection, cad} = this;
		if (collection === "CADmuban") {
			cad.data.components.data.forEach((v) => {
				v.components.data.forEach((vv) => generateLineTexts(cad, vv));
			});
		} else {
			cad.data.components.data.forEach((v) => generateLineTexts(cad, v));
		}
	}

	startLoader() {
		if (this.loaderId) {
			this.loader.startLoader(this.loaderId);
		} else {
			this.loader.start();
		}
	}

	stopLoader() {
		if (this.loaderId) {
			this.loader.stopLoader(this.loaderId);
		} else {
			this.loader.stop();
		}
	}
}

function setCadData(data: CadData) {
	if (data.options.length < 1) {
		data.options.push(new CadOption());
	}
	if (data.conditions.length < 1) {
		data.conditions.push("");
	}
	if (data.baseLines.length < 1) {
		data.baseLines.push(new CadBaseLine());
	}
	if (data.jointPoints.length < 1) {
		data.jointPoints.push(new CadJointPoint());
	}
	data.entities.dimension.forEach((e) => (e.color = new Color(0x00ff00)));
	data.partners.forEach((v) => setCadData(v));
	data.components.data.forEach((v) => setCadData(v));
}
