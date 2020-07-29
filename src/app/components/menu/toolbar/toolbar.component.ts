import {Component, OnInit, Output, EventEmitter, Injector, OnDestroy} from "@angular/core";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {CurrCadsAction, CadStatusAction, LoadingAction} from "@src/app/store/actions";
import {RSAEncrypt} from "@lucilor/utils";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {MenuComponent} from "../menu.component";
import {openMessageDialog} from "../../message/message.component";
import {openCadListDialog} from "../../cad-list/cad-list.component";
import {getCurrCadsData} from "@src/app/store/selectors";
import {Collection, removeCadGongshi, addCadGongshi, timeout, session, getDPI} from "@src/app/app.common";
import {ActivatedRoute} from "@angular/router";
import {takeUntil} from "rxjs/operators";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {validateLines} from "@src/app/cad-viewer/cad-data/cad-lines";
import {createPdf} from "pdfmake/build/pdfmake";

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

	constructor(injector: Injector, private route: ActivatedRoute) {
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
		let vid: string = null;
		try {
			cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data"));
			vid = sessionStorage.getItem("vid");
		} catch (error) {
			console.warn(error);
		}
		if (cachedData && vid) {
			this.collection = "order";
			// const {showLineLength, padding, showAll, suofang} = cachedData;
			// this.cad.config.showLineLength = showLineLength;
			// this.cad.config.padding = padding;
			// console.log(showLineLength);
			this.afterOpen([new CadData(cachedData)]);
		} else if (location.search) {
			this.route.queryParams.pipe(takeUntil(this.destroyed)).subscribe(async (params) => {
				dataService.encode = params.encode ? encodeURIComponent(params.encode) : "";
				dataService.data = params.data ? encodeURIComponent(params.data) : "";
				const data = await dataService.getCadData(dataService.data);
				if (typeof params.collection === "string") {
					this.collection = params.collection as Collection;
				}
				this.afterOpen(data);
			});
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
		this.lastCommand = {name: this.save.name, arguments};
		const {cad, dataService} = this;
		let result: CadData[] = [];
		const data = cad.data.components.data;
		if (this.collection === "p_yuanshicadwenjian") {
			const {name, extra} = await this.getCadStatus();
			if (name !== "split") {
				openMessageDialog(this.dialog, {data: {type: "alert", content: "原始CAD文件只能在选取时保存"}});
				return;
			}
			let indices: number[];
			if (typeof extra?.index === "number") {
				indices = [extra.index];
			} else {
				indices = [...Array(data.length).keys()];
			}
			for (const i of indices) {
				result = await dataService.postCadData(data[i].components.data, RSAEncrypt({collection: "cad"}));
				if (result) {
					data[extra.index].components.data = result;
					this.afterOpen();
				}
			}
		} else {
			const validateResult = [];
			data.forEach((v) => {
				removeCadGongshi(v);
				if (this.collection === "cad") {
					validateResult.push(validateLines(v));
				}
			});
			cad.render();
			if (validateResult.some((v) => !v.valid)) {
				const ref = openMessageDialog(this.dialog, {data: {type: "confirm", content: "当前打开的CAD存在错误，是否继续保存？"}});
				const yes = await ref.afterClosed().toPromise();
				if (!yes) {
					return;
				}
			}
			const postData: any = {};
			if (this.collection) {
				postData.collection = this.collection;
			}
			result = await dataService.postCadData(data, RSAEncrypt(postData));
			if (result) {
				this.afterOpen(result);
			}
		}
		return result;
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
			const currCads = await this.getCurrCads();
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

	showHelpInfo() {
		openMessageDialog(this.dialog, {
			data: {
				type: "alert",
				title: "帮助信息",
				content: "按下 <span style='color:red'>Ctrl + ~</span> 以重复上一次按下的顶部菜单栏按钮。"
			}
		});
	}

	async assembleCads() {
		this.lastCommand = {name: this.assembleCads.name, arguments};
		const {name} = await this.getCadStatus();
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
		const {name} = await this.getCadStatus();
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
