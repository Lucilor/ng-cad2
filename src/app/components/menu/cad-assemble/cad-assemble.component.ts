import {Component, OnInit, Input, OnDestroy} from "@angular/core";
import {MenuComponent} from "../menu.component";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {State} from "@src/app/store/state";
import {CadEntity} from "@src/app/cad-viewer/cad-data/cad-entity/cad-entity";
import {Object3D} from "three";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {Observable} from "rxjs";
import {Store} from "@ngrx/store";
import {getCadStatus} from "@src/app/store/selectors";

@Component({
	selector: "app-cad-assemble",
	templateUrl: "./cad-assemble.component.html",
	styleUrls: ["./cad-assemble.component.scss"]
})
export class CadAssembleComponent extends MenuComponent implements OnInit, OnDestroy {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	cadStatus: Observable<State["cadStatus"]>;
	options = {space: "0", position: "absolute"};
	ids: string[] = [];
	names: string[] = [];
	lines: string[] = [];
	get data() {
		return this.currCads[0];
	}

	constructor(private store: Store<State>) {
		super();
	}

	ngOnInit() {
		this.cadStatus = this.store.select(getCadStatus);
		this.cad.controls.on("entityselect", this.onEntitySelect);
	}

	ngOnDestroy() {
		this.cad.controls.off("entityselect", this.onEntitySelect);
	}

	onEntitySelect(event: PointerEvent, entity: CadEntity, object: Object3D) {
		console.log(1);
	}

	saveStatus() {}

	loadStatus() {}
}
