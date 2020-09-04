import {Component, OnInit, Output, EventEmitter, Injector, OnDestroy} from "@angular/core";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {CommandAction} from "@src/app/store/actions";
import {MenuComponent} from "../menu.component";
import {openMessageDialog} from "../../message/message.component";
import {Collection} from "@src/app/app.common";
import Color from "color";
import {CadViewerConfig} from "@src/app/cad-viewer/cad-viewer";

@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent extends MenuComponent implements OnInit, OnDestroy {
	@Output() afterOpenCad = new EventEmitter<void>();
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
		p: () => this.printCad()
	};
	showDimensions = true;
	showCadGongshis = true;
	prevLineTexts: CadViewerConfig["lineTexts"];
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
		this.prevLineTexts = {...this.cad.config.lineTexts};
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	clickBtn(key: string) {
		this.keyMap[key]?.();
	}

	open(collection: Collection) {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "open", args: [{name: "collection", value: collection}]}});
	}

	async save() {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "save", args: []}});
	}

	flip(vertical: boolean, horizontal: boolean) {
		this.store.dispatch<CommandAction>({
			type: "execute",
			command: {
				name: "flip",
				args: [
					{name: "horizontal", value: horizontal ? "true" : "false"},
					{name: "vertical", value: vertical ? "true" : "false"}
				]
			}
		});
	}

	async rotate(clockwise?: boolean) {
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
				angle = 90;
			} else if (clockwise === false) {
				angle = -90;
			}
		}
		this.store.dispatch<CommandAction>({
			type: "execute",
			command: {name: "rotate", args: [{name: "degrees", value: angle.toString()}]}
		});
	}

	showManual() {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "man", args: []}});
	}

	async assembleCads() {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "assemble", args: []}});
	}

	async splitCad() {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "split", args: []}});
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
		data.entities.dimension.forEach((e) => (e.color = new Color(0x00ff00)));
		data.partners.forEach((v) => this.setCadData(v));
		data.components.data.forEach((v) => this.setCadData(v));
	}

	toggleShowDimensions() {
		this.showDimensions = !this.showDimensions;
		const cad = this.cad;
		cad.data.getAllEntities().dimension.forEach((e) => (e.visible = this.showDimensions));
		cad.render();
	}

	toggleShowCadGongshis() {
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
		const cad = this.cad;
		cad.config.validateLines = !cad.config.validateLines;
		cad.render();
	}

	async setShowLineLength() {
		const ref = openMessageDialog(this.dialog, {
			data: {
				type: "prompt",
				title: "线长字体大小",
				promptData: {type: "number", hint: "若小于等于0则不显示", value: this.cad.config.lineTexts.lineLength.toString()}
			}
		});
		const num = Number(await ref.afterClosed().toPromise());
		this.cad.config.lineTexts.lineLength = num;
		this.cad.render();
	}

	toggleShowLineLength() {
		const cad = this.cad;
		const lineTexts = cad.config.lineTexts;
		if (lineTexts.lineLength > 0) {
			this.prevLineTexts.lineLength = lineTexts.lineLength;
			lineTexts.lineLength = 0;
		} else {
			lineTexts.lineLength = this.prevLineTexts.lineLength;
		}
		cad.render();
	}

	async setShowGongshi() {
		const ref = openMessageDialog(this.dialog, {
			data: {
				type: "prompt",
				title: "公式字体大小",
				promptData: {type: "number", hint: "若小于等于0则不显示", value: this.cad.config.lineTexts.gongshi.toString()}
			}
		});
		const num = Number(await ref.afterClosed().toPromise());
		this.cad.config.lineTexts.gongshi = num;
		this.cad.render();
	}

	toggleShowLineGongshi() {
		const cad = this.cad;
		const lineTexts = cad.config.lineTexts;
		if (lineTexts.gongshi > 0) {
			this.prevLineTexts.gongshi = lineTexts.gongshi;
			lineTexts.gongshi = 0;
		} else {
			lineTexts.gongshi = this.prevLineTexts.gongshi;
		}
		cad.render();
	}

	printCad() {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "print", args: []}});
	}

	fillet(radius?: number) {
		this.store.dispatch<CommandAction>({
			type: "execute",
			command: {name: "fillet", args: [{name: "radius", value: radius ? radius.toString() : "0"}]}
		});
	}
}
