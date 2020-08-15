import {Component, OnInit, Output, EventEmitter, Injector, OnDestroy} from "@angular/core";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {CurrCadsAction, CadStatusAction, LoadingAction, CommandAction} from "@src/app/store/actions";
import {Line, Point} from "@lucilor/utils";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {MenuComponent} from "../menu.component";
import {openMessageDialog} from "../../message/message.component";
import {openCadListDialog} from "../../cad-list/cad-list.component";
import {getCadStatus, getCurrCads, getCurrCadsData} from "@src/app/store/selectors";
import {Collection, removeCadGongshi, addCadGongshi, timeout, session, getDPI} from "@src/app/app.common";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {validateLines} from "@src/app/cad-viewer/cad-data/cad-lines";
import {createPdf} from "pdfmake/build/pdfmake";
import {MathUtils} from "three";
import {CadArc} from "@src/app/cad-viewer/cad-data/cad-entity/cad-arc";

@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent extends MenuComponent implements OnInit, OnDestroy {
	@Output() afterOpenCad = new EventEmitter<void>();
	collection: Collection;
	ids: string[];
	openLock = false;
	keyMap: {[key: string]: () => void} = {
		s: () => this.save(),
		1: () => this.open("p_yuanshicadwenjian"),
		2: () => this.open("cad"),
		3: () => this.open("CADmuban"),
		4: () => this.open("qiliaozuhe"),
		5: () => this.open("qieliaocad"),
		g: () => this.assembleCads(),
		h: () => this.splitCad(),
		"`": () => this.repeatLastCommand(),
		p: () => this.printCad()
	};
	lastCommand: {name: string; arguments: IArguments};
	showDimensions = true;
	showCadGongshis = true;
	lastUrl: string = null;

	constructor(injector: Injector) {
		super(injector);
	}

	async ngOnInit() {
		super.ngOnInit();
		window.addEventListener("keydown", (event) => {
			const {key, ctrlKey} = event;
			if (ctrlKey && this.keyMap[key]) {
				event.preventDefault();
				this.clickBtn(key);
			}
		});
		const {ids, collection, dataService} = this;
		let cachedData: any = null;
		let params: any = null;
		let vid: string = null;
		try {
			cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data"));
			params = JSON.parse(sessionStorage.getItem("params"));
			vid = sessionStorage.getItem("vid");
		} catch (error) {
			console.warn(error);
		}
		if (cachedData && vid) {
			this.collection = "order";
			const {showLineLength} = params;
			this.cad.config.showLineLength = showLineLength;
			this.afterOpen([new CadData(cachedData)]);
		} else if (location.search) {
			const data = await dataService.getCadData();
			if (typeof dataService.queryParams.collection === "string") {
				this.collection = dataService.queryParams.collection as Collection;
			}
			this.afterOpen(data);
		} else if (ids.length) {
			const data = await dataService.getCadData({ids, collection});
			this.afterOpen(data);
		}
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	clickBtn(key: string) {
		this.keyMap[key]?.();
	}

	open(collection: Collection) {
		this.lastCommand = {name: this.open.name, arguments};
		if (this.openLock) {
			return;
		}
		const selectMode = collection === "p_yuanshicadwenjian" ? "table" : "multiple";
		const checkedItems = this.cad.data.components.data;
		const ref = openCadListDialog(this.dialog, {data: {collection, selectMode, checkedItems}});
		this.openLock = true;
		ref.afterClosed().subscribe((data: CadData[]) => {
			if (data) {
				this.collection = collection;
				this.afterOpen(data);
			}
			this.openLock = false;
		});
	}

	afterOpen(data?: CadData[]) {
		const cad = this.cad;
		if (data) {
			cad.data.components.data = data;
			data.forEach((v) => {
				this.setCadData(v);
				addCadGongshi(v);
			});
			if (this.collection === "cad") {
				data.forEach((v) => validateLines(v));
			}
		}
		cad.reset(null, true);
		this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
		this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		this.afterOpenCad.emit();
	}

	async save() {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "save", args: []}});
	}

	flip(event: PointerEvent, vertical: boolean, horizontal: boolean) {
		this.lastCommand = {name: this.flip.name, arguments};
		event.stopPropagation();
		this.transform(new CadTransformation({flip: {vertical, horizontal}}));
	}

	async rotate(event: PointerEvent, clockwise?: boolean) {
		this.lastCommand = {name: this.rotate.name, arguments};
		event.stopPropagation();
		let angle = 0;
		if (clockwise === undefined) {
			const ref = openMessageDialog(this.dialog, {data: {type: "prompt", title: "输入角度", promptData: {type: "number"}}});
			const input = await ref.afterClosed().toPromise();
			if (input === false) {
				return;
			}
			angle = Number(input);
		} else {
			if (clockwise === true) {
				angle = Math.PI / 2;
			} else if (clockwise === false) {
				angle = -Math.PI / 2;
			}
		}
		this.transform(new CadTransformation({rotate: {angle}}), typeof clockwise === "boolean");
	}

	async transform(trans: CadTransformation, rotateDimension = false) {
		const {cad} = this;
		const seleted = cad.selectedEntities;
		if (seleted.length) {
			const {x, y} = cad.getBounds(seleted);
			trans.anchor.set(x, y);
			seleted.transform(trans);
		} else {
			const t = (data: CadData) => {
				const {x, y} = data.getBounds();
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
				removeCadGongshi(data);
				addCadGongshi(data);
			};
			const currCads = await this.getObservableOnce(getCurrCads);
			const currCadsData = getCurrCadsData(this.cad.data, currCads);
			if (currCadsData.length) {
				currCadsData.forEach((data) => t(data));
			} else {
				this.cad.data.components.data.forEach((data) => t(data));
			}
		}
		cad.data.updatePartners().updateComponents();
		cad.render();
	}

	showManual(name = "") {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "man", args: []}});
	}

	async assembleCads() {
		this.lastCommand = {name: this.assembleCads.name, arguments};
		const {name} = await this.getObservableOnce(getCadStatus);
		if (name === "assemble") {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		} else {
			const index = await this.takeOneMajorCad("装配");
			if (index !== null) {
				this.store.dispatch<CadStatusAction>({type: "set cad status", name: "assemble", index});
			}
		}
	}

	async splitCad() {
		this.lastCommand = {name: this.splitCad.name, arguments};
		const {name} = await this.getObservableOnce(getCadStatus);
		if (name === "split") {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		} else {
			const index = await this.takeOneMajorCad("选取");
			if (index !== null) {
				const collection = this.collection;
				this.store.dispatch<CadStatusAction>({type: "set cad status", name: "split", index, extra: {collection, index}});
			}
		}
	}

	repeatLastCommand() {
		if (this.lastCommand) {
			const {name, arguments: args} = this.lastCommand;
			this[name](...args);
		}
	}

	async takeOneMajorCad(desc: string) {
		const currCadsData = await this.getCurrCadsData();
		const ids = currCadsData.map((v) => v.id);
		const selected: {names: string[]; indices: number[]} = {names: [], indices: []};
		this.cad.data.components.data.forEach((v, i) => {
			if (ids.includes(v.id)) {
				selected.names.push(v.name);
				selected.indices.push(i);
			}
		});
		if (selected.indices.length < 1) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "请先选择一个主CAD"}});
			return null;
		} else if (selected.indices.length > 1) {
			const ref = openMessageDialog(this.dialog, {
				data: {
					type: "confirm",
					content: `你选择了多个主CAD。进入${desc}将自动选择<span style="color:red">${selected.names[0]}</span>，是否继续？`
				}
			});
			const yes = await ref.afterClosed().toPromise();
			if (!yes) {
				return;
			}
		}
		return selected.indices[0];
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
		data.entities.dimension.forEach((e) => e.color.set(0x00ff00));
		data.partners.forEach((v) => this.setCadData(v));
		data.components.data.forEach((v) => this.setCadData(v));
	}

	toggleShowDimensions() {
		this.lastCommand = {name: this.toggleShowDimensions.name, arguments};
		this.showDimensions = !this.showDimensions;
		const cad = this.cad;
		cad.data.getAllEntities().dimension.forEach((e) => (e.visible = this.showDimensions));
		cad.render();
	}

	toggleShowCadGongshis() {
		this.lastCommand = {name: this.toggleShowCadGongshis.name, arguments};
		this.showCadGongshis = !this.showCadGongshis;
		const cad = this.cad;
		cad.data.getAllEntities().mtext.forEach((e) => {
			if (e.info.isCadGongshi) {
				e.visible = this.showCadGongshis;
			}
		});
		cad.render();
	}

	toggleValidateLines() {
		this.lastCommand = {name: this.toggleValidateLines.name, arguments};
		const cad = this.cad;
		cad.config.validateLines = !cad.config.validateLines;
		cad.render();
	}

	async setShowLineLength() {
		this.lastCommand = {name: this.setShowLineLength.name, arguments};
		const ref = openMessageDialog(this.dialog, {
			data: {
				type: "prompt",
				title: "线长字体大小",
				promptData: {type: "number", hint: "若小于等于0则不显示", value: this.cad.config.showLineLength.toString()}
			}
		});
		const num = Number(await ref.afterClosed().toPromise());
		this.cad.config.showLineLength = num;
		this.cad.render();
	}

	async setShowGongshi() {
		this.lastCommand = {name: this.setShowGongshi.name, arguments};
		const ref = openMessageDialog(this.dialog, {
			data: {
				type: "prompt",
				title: "公式字体大小",
				promptData: {type: "number", hint: "若小于等于0则不显示", value: this.cad.config.showGongshi.toString()}
			}
		});
		const num = Number(await ref.afterClosed().toPromise());
		this.cad.config.showGongshi = num;
		this.cad.render();
	}

	/**
	 * A4: (210 × 297)mm²
	 *    =(8.26 × 11.69)in² (1in = 25.4mm)
	 * 	  =(794 × 1123)px² (96dpi)
	 */
	async printCad() {
		this.store.dispatch<LoadingAction>({type: "add loading", name: "printCad"});
		await timeout(100);
		const data = this.cad.data.clone();
		removeCadGongshi(data);
		let [dpiX, dpiY] = getDPI();
		if (!(dpiX > 0) || !(dpiY > 0)) {
			console.warn("Unable to get screen dpi.Assuming dpi = 96.");
			dpiX = dpiY = 96;
		}
		const width = (210 / 25.4) * dpiX * 0.75;
		const height = (297 / 25.4) * dpiY * 0.75;
		const scaleX = 300 / dpiX / 0.75;
		const scaleY = 300 / dpiY / 0.75;
		const scale = Math.sqrt(scaleX * scaleY);
		data.getAllEntities().forEach((e) => {
			if (e.linewidth >= 0.3) {
				e.linewidth *= 3;
			}
			e.color.set(0);
			if (e instanceof CadDimension) {
				e.selected = true;
			}
		});
		const cad = new CadViewer(data, {
			...this.cad.config,
			width: width * scaleX,
			height: height * scaleY,
			backgroundColor: 0xffffff,
			padding: 18 * scale,
			showStats: false,
			showLineLength: 0,
			showGongshi: 0
		});
		document.body.appendChild(cad.dom);
		cad.render();
		const src = cad.exportImage().src;
		cad.destroy();
		const pdf = createPdf({content: {image: src, width, height}, pageSize: "A4", pageMargins: 0});
		pdf.getBlob((blob) => {
			this.store.dispatch<LoadingAction>({type: "remove loading", name: "printCad"});
			const url = URL.createObjectURL(blob);
			open(url);
			URL.revokeObjectURL(this.lastUrl);
			this.lastUrl = url;
		});
	}

	async fillet(radius?: number) {
		const lines = this.cad.selectedEntities.line;
		if (lines.length !== 2) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "请先选择且只选择两条线段"}});
			return;
		}
		const {start: start1, end: end1} = lines[0];
		const {start: start2, end: end2} = lines[1];
		const p1 = new Point(start1.x, start1.y);
		const p2 = new Point(end1.x, end1.y);
		const p3 = new Point(start2.x, start2.y);
		const p4 = new Point(end2.x, end2.y);
		const l1 = new Line(p1.clone(), p2.clone());
		const l2 = new Line(p3.clone(), p4.clone());
		const point = l1.intersect(l2, true);
		if (!point) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "两条线平行"}});
			return;
		}
		if (radius === undefined) {
			const ref = openMessageDialog(this.dialog, {
				data: {type: "prompt", content: "请输入圆角半径", promptData: {type: "number", value: "10"}}
			});
			radius = Number(await ref.afterClosed().toPromise());
			if (!(radius > 0)) {
				openMessageDialog(this.dialog, {data: {type: "alert", content: "请输入大于零的数字"}});
				return;
			}
		}
		l1.start.set(point);
		l2.start.set(point);
		if (p1.distance(point) > p2.distance(point)) {
			l1.end.set(p1);
		}
		if (p3.distance(point) > p4.distance(point)) {
			l2.end.set(p3);
		}
		const theta1 = l1.theta;
		const theta2 = l2.theta;
		const theta3 = Math.abs(theta2 - theta1) / 2;
		let theta4 = (theta1 + theta2) / 2;
		let clockwise = theta1 > theta2;
		if (theta3 > Math.PI / 2) {
			theta4 -= Math.PI;
			clockwise = !clockwise;
		}
		const d1 = Math.abs(radius / Math.tan(theta3));
		const d2 = Math.abs(radius / Math.sin(theta4));
		console.log(MathUtils.radToDeg(theta1), MathUtils.radToDeg(theta2));
		const start = new Point(Math.cos(theta1), Math.sin(theta1)).multiply(d1).add(point);
		const end = new Point(Math.cos(theta2), Math.sin(theta2)).multiply(d1).add(point);
		if (!l1.containsPoint(start) || !l2.containsPoint(end)) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "半径过大"}});
			return;
		}
		const center = new Point(Math.cos(theta4), Math.sin(theta4)).multiply(d2).add(point);
		if (p1.distance(point) < p2.distance(point)) {
			lines[0].start.set(start.x, start.y);
		} else {
			lines[0].end.set(start.x, start.y);
		}
		if (p3.distance(point) < p4.distance(point)) {
			lines[1].start.set(end.x, end.y);
		} else {
			lines[1].end.set(end.x, end.y);
		}
		if (radius > 0) {
			const cadArc = new CadArc({center: center.toArray(), radius, color: lines[0].color});
			cadArc.start_angle = MathUtils.radToDeg(new Line(start, point).theta);
			cadArc.end_angle = MathUtils.radToDeg(new Line(end, point).theta);
			cadArc.clockwise = clockwise;
			const data = (await this.getCurrCadsData())[0];
			data.entities.add(cadArc);
		}
		this.cad.unselectAll();
	}

	saveStatus() {
		const data = {
			collection: this.collection,
			ids: this.cad.data.components.data.map((v) => v.id)
		};
		session.save("toolbar", data);
	}

	loadStatus() {
		const data = session.load("toolbar");
		this.collection = data?.collection;
		this.ids = data?.ids || [];
	}
}
