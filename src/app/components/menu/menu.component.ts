import {Component, OnDestroy, Injector, Input, OnInit} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {MatDialog} from "@angular/material/dialog";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {Subject} from "rxjs";
import {getCurrCads, getCurrCadsData} from "@src/app/store/selectors";
import {take, takeUntil} from "rxjs/operators";

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
	destroyed = new Subject();
	contextMenuPosition = {x: "0px", y: "0px"};

	constructor(injector: Injector) {
		this.dataService = injector.get(CadDataService);
		this.store = injector.get(Store);
		this.dialog = injector.get(MatDialog);
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
}
