import {Component, OnInit, ViewChild, ElementRef, Injector, OnDestroy, AfterViewInit} from "@angular/core";
import {MenuComponent} from "../menu/menu.component";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";
import {CadLineComponent} from "../menu/cad-line/cad-line.component";
import {CadDimensionComponent} from "../menu/cad-dimension/cad-dimension.component";
import {CadAssembleComponent} from "../menu/cad-assemble/cad-assemble.component";
import {CadViewer, CadViewerConfig} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadStatusAction, ConfigAction} from "@src/app/store/actions";
import {MatMenuTrigger} from "@angular/material/menu";
import {globalVars, setApp} from "@src/app/app.common";
import {trigger, state, style, transition, animate} from "@angular/animations";
import {CadConsoleComponent} from "../cad-console/cad-console.component";
import {getCadStatus, getConfig} from "@src/app/store/selectors";
import {State} from "@src/app/store/state";

@Component({
	selector: "app-index",
	templateUrl: "./index.component.html",
	styleUrls: ["./index.component.scss"],
	animations: [
		trigger("closeTop", [
			state("open", style({transform: "translateY(0)"})),
			state("closed", style({transform: "translateY(-100%)"})),
			transition("open <=> closed", [animate("0.3s")])
		]),
		trigger("closeRight", [
			state("open", style({transform: "translateX(0)"})),
			state("closed", style({transform: "translateX(100%)"})),
			transition("open <=> closed", [animate("0.3s")])
		]),
		trigger("closeBottom", [
			state("open", style({transform: "translateY(0)"})),
			state("closed", style({transform: "translateY(100%)"})),
			transition("open <=> closed", [animate("0.3s")])
		]),
		trigger("closeLeft", [
			state("open", style({transform: "translateX(0)"})),
			state("closed", style({transform: "translateX(-100%)"})),
			transition("open <=> closed", [animate("0.3s")])
		])
	]
})
export class IndexComponent extends MenuComponent implements OnInit, OnDestroy, AfterViewInit {
	cadStatusStr: string;
	formulas: string[] = [];
	shownMenus: ("cadInfo" | "entityInfo" | "cadAssemble")[] = ["cadInfo", "entityInfo"];
	showTopMenu = true;
	showRightMenu = true;
	showBottomMenu = true;
	showLeftMenu = true;
	showAllMenu = true;
	menuPadding = [40, 270, 20, 220];
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild(ToolbarComponent) toolbar: ToolbarComponent;
	@ViewChild(SubCadsComponent) subCads: SubCadsComponent;
	@ViewChild(CadInfoComponent) cadInfo: CadInfoComponent;
	@ViewChild(CadLineComponent) cadLine: CadLineComponent;
	@ViewChild(CadDimensionComponent) cadDimension: CadDimensionComponent;
	@ViewChild(CadAssembleComponent) cadAssemble: CadAssembleComponent;
	@ViewChild(MatMenuTrigger) contextMenu: MatMenuTrigger;
	@ViewChild(CadConsoleComponent) console: CadConsoleComponent;

	// ! (deprecated) shortcuts for testing
	// tslint:disable: no-string-literal
	/** @deprecated */
	get data() {
		console.warn("window.app.data已弃用, 使用window.data.");
		return window["data"];
	}
	/** @deprecated */
	get data0() {
		console.warn("window.app.data0已弃用, 使用window.data0.");
		return window["data0"];
	}
	/** @deprecated */
	get dataEx() {
		console.warn("window.app.dataEx已弃用, 使用window.dataEx.");
		return window["dataEx"];
	}
	/** @deprecated */
	get data0Ex() {
		console.warn("window.app.data0Ex已弃用, 使用window.data0Ex.");
		return window["data0Ex"];
	}
	// tslint:enable: no-string-literal

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		setApp(this);
		// this.dataService.getSampleFormulas().then((result) => {
		// 	this.formulas = result;
		// });
		const configOverwrite: Partial<CadViewerConfig> = {
			width: innerWidth,
			height: innerHeight,
			padding: this.menuPadding.map((v) => v + 30),
			selectMode: "multiple"
		};
		globalVars.cad = new CadViewer(new CadData(), configOverwrite);
		this.store.dispatch<ConfigAction>({type: "set config", config: configOverwrite});
		this.getObservable(getConfig).subscribe(this.applyConfig.bind(this));

		this.getObservable(getCadStatus).subscribe((cadStatus) => {
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
			} else if (cadStatus.name === "draw line") {
				this.cadStatusStr = "画线";
			}
		});

		this.cad.on("keydown", async ({key}) => {
			if (key === "Escape") {
				const {name} = await this.getObservableOnce(getCadStatus);
				if (name === "assemble" || name === "split") {
					return;
				}
				if (name !== "normal") {
					this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal", index: -1});
				}
			}
		});

		window.addEventListener("resize", () => this.cad.resize(innerWidth, innerHeight));
		window.addEventListener("contextmenu", (event) => event.preventDefault());

		// this.cad.beforeRender = throttle(() => {
		// const collection = getCollection();
		// const {showLineLength, showGongshi} = this.cad.config;
		// const data = new CadData();
		// if (collection === "CADmuban") {
		// 	this.data.components.data.forEach((v) => {
		// 		v.components.data.forEach((vv) => data.merge(vv));
		// 	});
		// } else {
		// 	data.merge(this.data);
		// }
		// const toRemove = generateLineTexts(data, {length: showLineLength, gongshi: showGongshi});
		// toRemove.forEach((e) => this.cad.scene.remove(e?.object));
		// });
	}

	ngAfterViewInit() {
		this.cad.appendTo(this.cadContainer.nativeElement);
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	onContextMenu(event: PointerEvent) {
		super.onContextMenu(event);
		this.contextMenu.openMenu();
	}

	zoomAll() {
		this.cad.center();
	}

	selectComponent(id: string) {
		const index = this.subCads.components.findIndex((v) => v.data.id === id);
		this.subCads.clickCad("components", index);
	}

	private _setCadPadding(show: boolean, i: number) {
		const padding = this.cad.config("padding");
		if (show) {
			padding[i] += this.menuPadding[i];
		} else {
			padding[i] -= this.menuPadding[i];
		}
		this.cad.config({padding});
	}

	toggleTopMenu(show?: boolean) {
		this.showTopMenu = show ?? !this.showTopMenu;
		this._setCadPadding(this.showTopMenu, 0);
	}

	toggleRightMenu(show?: boolean) {
		this.showRightMenu = show ?? !this.showRightMenu;
		this._setCadPadding(this.showRightMenu, 1);
	}

	toggleBottomMenu(show?: boolean) {
		this.showBottomMenu = show ?? !this.showBottomMenu;
		this._setCadPadding(this.showBottomMenu, 2);
	}

	toggleLeftMenu(show?: boolean) {
		this.showLeftMenu = show ?? !this.showLeftMenu;
		this._setCadPadding(this.showLeftMenu, 3);
	}

	toggleAllMenu(show?: boolean) {
		this.showAllMenu = show ?? !this.showAllMenu;
		this.toggleTopMenu(this.showAllMenu);
		this.toggleRightMenu(this.showAllMenu);
		this.toggleBottomMenu(this.showAllMenu);
		this.toggleLeftMenu(this.showAllMenu);
	}

	applyConfig(config: State["config"]) {
		config = JSON.parse(JSON.stringify(config));
		this.cad.config(config);
	}
}
