import {Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy, Injector} from "@angular/core";
import {CadViewer} from "./cad-viewer/cad-viewer";
import {CadData} from "./cad-viewer/cad-data/cad-data";
import {ToolbarComponent} from "./components/menu/toolbar/toolbar.component";
import {SubCadsComponent} from "./components/menu/sub-cads/sub-cads.component";
import {environment} from "@src/environments/environment";
import {CadStatusAction, CurrCadsAction} from "./store/actions";
import {timeout} from "./app.common";
import {CadInfoComponent} from "./components/menu/cad-info/cad-info.component";
import {CadDimensionComponent} from "./components/menu/cad-dimension/cad-dimension.component";
import {take, takeUntil} from "rxjs/operators";
import {MenuComponent} from "./components/menu/menu.component";
import {CadAssembleComponent} from "./components/menu/cad-assemble/cad-assemble.component";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent extends MenuComponent implements OnInit, AfterViewInit, OnDestroy {
	collection = "";
	cadStatusStr: string;
	formulas: string[] = [];
	shownMenus: ("cadInfo" | "entityInfo" | "cadAssemble")[] = ["cadInfo", "entityInfo"];
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild(ToolbarComponent) toolbar: ToolbarComponent;
	@ViewChild(SubCadsComponent) subCads: SubCadsComponent;
	@ViewChild(CadInfoComponent) cadInfo: CadInfoComponent;
	@ViewChild(CadDimensionComponent) cadDimension: CadDimensionComponent;
	@ViewChild(CadAssembleComponent) cadAssemble: CadAssembleComponent;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.dataService.getSampleFormulas().then((result) => {
			this.formulas = result;
		});
		this.cad = new CadViewer(new CadData(), {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [50, 300, 30, 250],
			showLineLength: 8,
			showGongshi: 8
		});
		this.cad.setControls({selectMode: "multiple"});
		if (this.cad.stats) {
			this.cad.stats.dom.style.right = "0";
			this.cad.stats.dom.style.left = "";
		}
		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe((cadStatus) => {
			if (cadStatus.name === "normal") {
				this.cadStatusStr = "普通";
				this.shownMenus = ["cadInfo", "entityInfo"];
			} else if (cadStatus.name === "select baseline") {
				this.cadStatusStr = "选择基准线";
			} else if (cadStatus.name === "select jointpoint") {
				this.cadStatusStr = "选择连接点";
			} else if (cadStatus.name === "edit dimension") {
				this.cadStatusStr = "编辑标注";
			} else if (cadStatus.name === "assemble") {
				this.cadStatusStr = "装配";
				this.shownMenus = ["cadAssemble"];
			} else if (cadStatus.name === "split") {
				this.cadStatusStr = "选取";
			}
		});

		this.cad.controls.on("entitiesdelete", () => this.refreshCurrCads());

		Object.assign(window, {app: this});
		window.addEventListener("resize", () => this.cad.resize(innerWidth, innerHeight));
		window.addEventListener("keydown", async ({key}) => {
			const {name} = await this.cadStatus.pipe(take(1)).toPromise();
			if (key === "Escape") {
				if (name !== "normal") {
					this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal", index: -1});
				}
			}
		});
		window.addEventListener("contextmenu", (event) => {
			event.preventDefault();
		});
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
		(async () => {
			await timeout(0);
			this.subCads.updateList();
		})();
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	afterOpenCad(data: CadData[]) {
		data.forEach((v) => this.toolbar.setCadData(v));
		this.cad.data.components.data = data;
		this.cad.reset();
		document.title = data.map((v) => v.name).join(", ");
		this.subCads.updateList();
	}

	refreshCurrCads() {
		this.store.dispatch<CurrCadsAction>({type: "refresh curr cads"});
	}
}
