import {Component, OnInit, Output, EventEmitter, Injector, OnDestroy} from "@angular/core";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialogRef} from "@angular/material/dialog";
import {CurrCadsAction, CadStatusAction} from "@src/app/store/actions";
import {RSAEncrypt} from "@lucilor/utils";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {MenuComponent} from "../menu.component";
import {MessageComponent} from "../../message/message.component";
import {CadListComponent} from "../../cad-list/cad-list.component";
import {getCurrCadsData} from "@src/app/store/selectors";
import {Collection, timeout} from "@src/app/app.common";
import {ActivatedRoute} from "@angular/router";
import {takeUntil} from "rxjs/operators";
import {CadMtext} from "@src/app/cad-viewer/cad-data/cad-entity/cad-mtext";
import {Vector2} from "three";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";

@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent extends MenuComponent implements OnInit, OnDestroy {
	@Output() openCad = new EventEmitter<CadData[]>();
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
		"`": () => this.repeatLastCommand()
	};
	lastCommand: {name: string; args: IArguments};
	showCadGongshis = true;
	cadGongshis: {[key: string]: CadMtext} = {};

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
		if (location.search) {
			this.route.queryParams.pipe(takeUntil(this.destroyed)).subscribe(async (params) => {
				dataService.encode = params.encode ? encodeURIComponent(params.encode) : "";
				dataService.data = params.data ? encodeURIComponent(params.data) : "";
				const data = await dataService.getCadData(dataService.data);
				this.openCad.emit(data);
			});
		} else if (ids.length) {
			const data = await dataService.getCadData({ids, collection});
			this.openCad.emit(data);
		}

		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe(async () => {
			await timeout(0);
			this.updateCadGongshis();
		});
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	clickBtn(key: string) {
		this.keyMap[key]?.();
	}

	open(collection: Collection) {
		this.lastCommand = {name: this.open.name, args: arguments};
		if (this.openLock) {
			return;
		}
		const selectMode = collection === "p_yuanshicadwenjian" ? "table" : "multiple";
		const ref: MatDialogRef<CadListComponent, CadData[]> = this.dialog.open(CadListComponent, {
			data: {collection, selectMode, checkedItems: this.cad.data.components.data}
		});
		this.openLock = true;
		ref.afterClosed().subscribe((data) => {
			if (data) {
				this.collection = collection;
				this.openCad.emit(data);
				this.store.dispatch<CurrCadsAction>({type: "clear curr cads"});
			}
			this.openLock = false;
		});
	}

	async save() {
		this.lastCommand = {name: this.save.name, args: arguments};
		const {cad, dataService} = this;
		let result: CadData[] = [];
		const data = cad.data.components.data;
		if (this.collection === "p_yuanshicadwenjian") {
			const {name, extra} = await this.getCadStatus();
			if (name === "split") {
				result = await dataService.postCadData(data[extra.index].components.data, RSAEncrypt({collection: "cad"}));
				cad.data.components.data[0].components.data = result;
				cad.render();
			} else {
				this.dialog.open(MessageComponent, {data: {type: "alert", content: "无法保存CAD原始文件"}});
			}
		} else {
			data.forEach((v) => this.removeCadGongshi(v));
			const postData: any = {};
			if (this.collection) {
				postData.collection = this.collection;
			}
			result = await dataService.postCadData(data, RSAEncrypt(postData));
		}
		return result;
	}

	flip(event: PointerEvent, vertical: boolean, horizontal: boolean) {
		this.lastCommand = {name: this.flip.name, args: arguments};
		event.stopPropagation();
		this.transform(new CadTransformation({flip: {vertical, horizontal}}));
	}

	async rotate(event: PointerEvent, clockwise?: boolean) {
		this.lastCommand = {name: this.rotate.name, args: arguments};
		event.stopPropagation();
		let angle = 0;
		if (clockwise === undefined) {
			const ref = this.dialog.open(MessageComponent, {data: {type: "prompt", title: "输入角度"}});
			const input = await ref.afterClosed().toPromise();
			if (input === false) {
				return;
			}
			angle = Number(input);
			if (isNaN(angle)) {
				this.dialog.open(MessageComponent, {data: {type: "alert", content: "请输入数字"}});
				return;
			}
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
			const {x, y} = seleted.getBounds();
			trans.anchor.set(x, y);
			seleted.transform(trans);
		} else {
			const t = (data: CadData) => {
				const {x, y} = data.getAllEntities().getBounds();
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
				this.removeCadGongshi(data);
				this.addCadGongshi(data);
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
		this.updateCadGongshis();
	}

	showHelpInfo() {
		this.dialog.open(MessageComponent, {
			data: {
				type: "alert",
				title: "帮助信息",
				content: "按下 <span style='color:red'>Ctrl + ~</span> 以重复上一次按下的顶部菜单栏按钮。"
			}
		});
	}

	async assembleCads() {
		this.lastCommand = {name: this.assembleCads.name, args: arguments};
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
		this.lastCommand = {name: this.splitCad.name, args: arguments};
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
			const {name, args} = this.lastCommand;
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
			this.dialog.open(MessageComponent, {data: {type: "alert", content: "请先选择一个主CAD"}});
			return null;
		} else if (selected.indices.length > 1) {
			const ref = this.dialog.open(MessageComponent, {
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
		data.partners.forEach((v) => this.setCadData(v));
		data.components.data.forEach((v) => this.setCadData(v));
		if (this.collection !== "p_yuanshicadwenjian") {
			this.addCadGongshi(data);
		}
	}

	addCadGongshi(data: CadData) {
		const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
		const mtext = new CadMtext();
		const {x, y, width, height} = data.getAllEntities().getBounds();
		mtext.text = `${zhankaikuan} x ${zhankaigao} = ${shuliang}`;
		if (Number(shuliangbeishu) > 1) {
			mtext.text += " x " + shuliangbeishu;
		}
		mtext.insert = new Vector2(x - width / 2, y - height / 2 - 10);
		mtext.visible = this.showCadGongshis;
		data.entities.add(mtext);
		this.cadGongshis[data.id] = mtext;
		data.partners.forEach((d) => this.addCadGongshi(d));
		data.components.data.forEach((d) => this.addCadGongshi(d));
	}

	removeCadGongshi(data: CadData) {
		this.cad.removeEntity(this.cadGongshis[data.id]);
	}

	updateCadGongshis() {
		const entities = new CadEntities();
		entities.mtext = Object.values(this.cadGongshis);
		this.cad.traverse((e) => {
			e.selectable = false;
			e.selected = false;
		}, entities);
	}

	saveStatus() {
		const data = {
			collection: this.collection,
			ids: this.cad.data.components.data.map((v) => v.id)
		};
		this.session.save("toolbar", data);
	}

	loadStatus() {
		const data = this.session.load("toolbar", true);
		this.collection = data.collection;
		this.ids = data.ids || [];
	}
}
