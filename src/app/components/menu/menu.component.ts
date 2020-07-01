import {SessionStorage} from "@lucilor/utils";
import {Component, OnDestroy, Injector, Input, OnInit} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {MatDialog} from "@angular/material/dialog";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";

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
	session = new SessionStorage("ngCadMenu");
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
	}

	saveStatus() {}

	loadStatus() {}

	onContextMenu(event: PointerEvent, ..._args: any[]) {
		event.preventDefault();
		this.contextMenuPosition.x = event.clientX + "px";
		this.contextMenuPosition.y = event.clientY + "px";
	}
}
