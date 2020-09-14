import {Component, OnInit, Output, EventEmitter, Injector, OnDestroy} from "@angular/core";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@app/cad-viewer/cad-data/cad-data";
import {CommandAction, ConfigAction} from "@app/store/actions";
import {MenuComponent} from "../menu.component";
import {openMessageDialog} from "../../message/message.component";
import {Collection} from "@app/app.common";
import Color from "color";
import {getConfig} from "@app/store/selectors";
import {generateLineTexts} from "@app/cad-viewer/cad-data/cad-lines";
import {CadMtext} from "@app/cad-viewer/cad-data/cad-entity";

@Component({
	selector: "app-toolbar",
	templateUrl: "./toolbar.component.html",
	styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent extends MenuComponent implements OnInit, OnDestroy {
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
		if (this.showCadGongshis !== (await this.getObservableOnce(getConfig)).showCadGongshis) {
			this.toggleShowCadGongshis();
		}
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

	async toggleShowDimensions() {
		const hideDimensions = !(await this.getObservableOnce(getConfig)).hideDimensions;
		this.store.dispatch<ConfigAction>({type: "set config", config: {hideDimensions}});
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
		this.store.dispatch<ConfigAction>({type: "set config", config: {showCadGongshis: this.showCadGongshis}});
	}

	toggleValidateLines() {
		const validateLines = !this.cad.config("validateLines");
		this.store.dispatch<ConfigAction>({type: "set config", config: {validateLines}});
	}

	async setShowLineLength() {
		const ref = openMessageDialog(this.dialog, {
			data: {
				type: "prompt",
				title: "线长字体大小",
				promptData: {type: "number", hint: "若小于等于0则不显示", value: this.cad.config("lineLength").toString()}
			}
		});
		const num = Number(await ref.afterClosed().toPromise());
		this.store.dispatch<ConfigAction>({type: "set config", config: {lineLength: num}});
	}

	toggleShowLineLength() {
		const hideLineLength = !this.cad.config("hideLineLength");
		this.store.dispatch<ConfigAction>({type: "set config", config: {hideLineLength}});
	}

	async setShowGongshi() {
		const ref = openMessageDialog(this.dialog, {
			data: {
				type: "prompt",
				title: "公式字体大小",
				promptData: {type: "number", hint: "若小于等于0则不显示", value: this.cad.config("lineGongshi").toString()}
			}
		});
		const num = Number(await ref.afterClosed().toPromise());
		this.store.dispatch<ConfigAction>({type: "set config", config: {lineGongshi: num}});
	}

	toggleShowLineGongshi() {
		const hideLineGongshi = !this.cad.config("hideLineGongshi");
		this.store.dispatch<ConfigAction>({type: "set config", config: {hideLineGongshi}});
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

	resetLineLength() {
		this.cad.data.getAllEntities().forEach((e) => {
			if (e.info.isLengthText) {
				e.info.offset = [0, 0];
				console.log(e);
			}
		}, true);
		this.cad.render();
	}
}
