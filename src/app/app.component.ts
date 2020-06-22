import {Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy} from "@angular/core";
import {CadViewer} from "./cad-viewer/cad-viewer";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "./cad-viewer/cad-data/cad-data";
import {Store} from "@ngrx/store";
import {ToolbarComponent} from "./components/menu/toolbar/toolbar.component";
import {SubCadsComponent} from "./components/menu/sub-cads/sub-cads.component";
import {environment} from "@src/environments/environment";
import {getCurrCads, getCadStatus} from "./store/selectors";
import {CadStatusAction, CurrCadsAction} from "./store/actions";
import {Vector2} from "three";
import {CadTransformation} from "./cad-viewer/cad-data/cad-transformation";
import {timeout} from "./app.common";
import {State} from "./store/state";
import {CadInfoComponent} from "./components/menu/cad-info/cad-info.component";
import {CadDimensionComponent} from "./components/menu/cad-dimension/cad-dimension.component";
import {CadDataService} from "./services/cad-data.service";
import {take, takeUntil} from "rxjs/operators";
import {Observable, Subject} from "rxjs";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
	cad: CadViewer;
	collection = "";
	currCads: CadData[];
	cadStatusStr: string;
	formulas: string[] = [];
	cadStatus: Observable<State["cadStatus"]>;
	destroyed = new Subject();
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	@ViewChild(ToolbarComponent) toolbar: ToolbarComponent;
	@ViewChild(SubCadsComponent) subCads: SubCadsComponent;
	@ViewChild(CadInfoComponent) cadInfo: CadInfoComponent;
	@ViewChild(CadDimensionComponent) cadDimension: CadDimensionComponent;

	constructor(private store: Store<State>, private dataService: CadDataService) {}

	ngOnInit() {
		this.dataService.getSampleFormulas().then((result) => {
			this.formulas = result;
		});
		this.cad = new CadViewer(new CadData(), {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			padding: [50, 300, 30, 250],
			showLineLength: 8
		});
		this.cad.setControls({selectMode: "multiple"});
		if (this.cad.stats) {
			this.cad.stats.dom.style.right = "0";
			this.cad.stats.dom.style.left = "";
		}
		this.store.select(getCurrCads).subscribe((cads) => {
			const ids = [];
			for (const id in cads) {
				const cad = cads[id];
				if (cad.self && cad.full) {
					ids.push(id);
				} else {
					ids.push(...cad.partners, ...cad.components);
				}
			}
			this.currCads = this.cad.data.findChildren(ids);
			this.currCads.forEach((v) => this.setCadData(v));
		});
		this.cadStatus = this.store.select(getCadStatus);
		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe((cadStatus) => {
			if (cadStatus.name === "normal") {
				this.cadStatusStr = "普通";
			} else if (cadStatus.name === "select baseline") {
				this.cadStatusStr = "选择基准线";
			} else if (cadStatus.name === "select jointpoint") {
				this.cadStatusStr = "";
			} else if (cadStatus.name === "edit dimension") {
				this.cadStatusStr = "编辑标注";
			} else if (cadStatus.name === "assemble") {
				this.cadStatusStr = "装配";
			}
			this.cad.render();
		});

		let lastPointer: Vector2 = null;
		const controls = this.cad.controls;
		controls.on("dragstart", ({clientX, clientY, shiftKey, button}) => {
			if (controls.config.dragAxis === "" && (button === 1 || (shiftKey && button === 0))) {
				lastPointer = new Vector2(clientX, clientY);
			}
		});
		controls.on("drag", ({clientX, clientY}) => {
			if (lastPointer) {
				const {cad, currCads} = this;
				const pointer = new Vector2(clientX, clientY);
				const translate = lastPointer.sub(pointer).divideScalar(cad.scale);
				translate.x = -translate.x;
				currCads.forEach((v) => v.transform(new CadTransformation({translate})));
				cad.render();
				lastPointer.copy(pointer);
			}
		});
		controls.on("dragend", () => {
			lastPointer = null;
		});
		controls.on("entitiesdelete", () => this.refreshCurrCads());

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
			this.subCads.update();
		})();
	}

	ngOnDestroy() {
		this.destroyed.next();
	}

	afterOpenCad(data: CadData[]) {
		this.cad.data.components.data = data;
		this.cad.reset();
		document.title = data.map((v) => v.name).join(", ");
		this.subCads.update();
	}

	setCadData(data: CadData) {
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
		// const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
		// const mtext = new CadMtext();
		// const {x, y, width, height} = data.getAllEntities().getBounds();
		// mtext.text = `${zhankaikuan} x ${zhankaigao} = ${shuliang}`;
		// if (Number(shuliangbeishu) > 1) {
		// 	mtext.text += " x " + shuliangbeishu;
		// }
		// mtext.insert = new Vector2(x - width / 2, y - height / 2 - 10);
		// mtext.visible = this.showCadGongshis;
		// data.entities.add(mtext);
		// this.cadGongshis.push(mtext);
		data.partners.forEach((v) => this.setCadData(v));
		data.components.data.forEach((v) => this.setCadData(v));
	}

	refreshCurrCads() {
		this.store.dispatch<CurrCadsAction>({type: "refresh curr cads"});
	}

	async isMenuVisible(type: number) {
		const {name} = await this.cadStatus.pipe(take(1)).toPromise();
		if (type === 0) {
			return name !== "assemble";
		}
		if (type === 1) {
			return name === "assemble";
		}
		return false;
	}
}
