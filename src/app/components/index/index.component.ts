import {Component, OnInit, ViewChild, ElementRef, Injector, OnDestroy, AfterViewInit} from "@angular/core";
import {MenuComponent} from "../menu/menu.component";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";
import {CadDimensionComponent} from "../menu/cad-dimension/cad-dimension.component";
import {CadAssembleComponent} from "../menu/cad-assemble/cad-assemble.component";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {environment} from "@src/environments/environment";
import {takeUntil, take} from "rxjs/operators";
import {CadStatusAction, CurrCadsAction} from "@src/app/store/actions";
import {MatMenuTrigger} from "@angular/material/menu";
import {timeout} from "@src/app/app.common";
import {trigger, state, style, transition, animate} from "@angular/animations";

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
	collection = "";
	cadStatusStr: string;
	formulas: string[] = [];
	shownMenus: ("cadInfo" | "entityInfo" | "cadAssemble")[] = ["cadInfo", "entityInfo"];
	showTopMenu = true;
	showRightMenu = true;
	showBottomMenu = true;
	showLeftMenu = true;
	showAllMenu = true;
	menuPadding = [40, 250, 20, 200];
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild(ToolbarComponent) toolbar: ToolbarComponent;
	@ViewChild(SubCadsComponent) subCads: SubCadsComponent;
	@ViewChild(CadInfoComponent) cadInfo: CadInfoComponent;
	@ViewChild(CadDimensionComponent) cadDimension: CadDimensionComponent;
	@ViewChild(CadAssembleComponent) cadAssemble: CadAssembleComponent;
	@ViewChild(MatMenuTrigger) contextMenu: MatMenuTrigger;

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
			padding: this.menuPadding.map((v) => v + 30),
			showLineLength: 8,
			showGongshi: 8,
			validateLines: false
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

		let escapeDisabled = false;
		this.cad.controls.on("entitiesdelete", () => this.refreshCurrCads());
		this.cad.controls.on("entitiesunselect", ({key}: KeyboardEvent) => {
			if (key === "Escape") {
				escapeDisabled = true;
			}
		});
		this.cad.dom.addEventListener("keydown", async ({key}) => {
			if (key === "Escape") {
				if (escapeDisabled) {
					escapeDisabled = false;
					return;
				}
				const {name} = await this.cadStatus.pipe(take(1)).toPromise();
				if (name === "assemble" || name === "split") {
					return;
				}
				if (name !== "normal") {
					this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal", index: -1});
				}
			}
		});

		Object.assign(window, {app: this});
		window.addEventListener("resize", () => this.cad.resize(innerWidth, innerHeight));
		window.addEventListener("contextmenu", (event) => {
			event.preventDefault();
		});
	}

	ngAfterViewInit() {
		this.cadContainer.nativeElement.appendChild(this.cad.dom);
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

	refresh() {
		this.refreshCurrCads();
		this.afterOpenCad();
	}

	async afterOpenCad() {
		document.title = this.cad.data.components.data.map((v) => v.name).join(", ");
		if (this.subCads) {
			await this.subCads.updateList();
			// await timeout(100);
			this.cad.render(true);
		} else {
			await timeout(0);
			this.refresh();
		}
	}

	refreshCurrCads() {
		this.store.dispatch<CurrCadsAction>({type: "refresh curr cads"});
	}

	selectComponent(id: string) {
		const index = this.subCads.components.findIndex((v) => v.data.id === id);
		this.subCads.clickCad("components", index);
	}

	private _setCadPadding(show: boolean, i: number) {
		if (show) {
			this.cad.config.padding[i] += this.menuPadding[i];
		} else {
			this.cad.config.padding[i] -= this.menuPadding[i];
		}
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
}
