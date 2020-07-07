import {Component, OnDestroy, Injector, Input, OnInit} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {MatDialog} from "@angular/material/dialog";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {Subject, Observable} from "rxjs";
import {getCadStatus, getCurrCads, getCurrCadsData} from "@src/app/store/selectors";
import {take} from "rxjs/operators";

@Component({
	selector: "app-menu",
	template: "",
	providers: [CadDataService, Store, MatDialog]
})
export class MenuComponent implements OnInit, OnDestroy {
	protected dataService: CadDataService;
	protected store: Store<State>;
	protected dialog: MatDialog;
	@Input() cad: CadViewer;
	cadStatus: Observable<State["cadStatus"]>;
	currCads: Observable<State["currCads"]>;
	destroyed = new Subject();
	contextMenuPosition = {x: "0px", y: "0px"};

	constructor(injector: Injector) {
		this.dataService = injector.get(CadDataService);
		this.store = injector.get(Store);
		this.dialog = injector.get(MatDialog);
		this.cadStatus = this.store.select(getCadStatus);
		this.currCads = this.store.select(getCurrCads);
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

	async getCadStatus() {
		return await this.cadStatus.pipe(take(1)).toPromise();
	}

	async getCurrCads() {
		return await this.currCads.pipe(take(1)).toPromise();
	}

	async getCurrCadsData() {
		return getCurrCadsData(this.cad.data, await this.getCurrCads());
	}
}
