import {Component, OnInit, OnDestroy, Injector} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadMtext} from "@src/app/cad-viewer/cad-data/cad-entity";
import {getCurrCads, getCurrCadsData} from "@src/app/store/selectors";
import {ColorPickerEventArgs} from "@syncfusion/ej2-angular-inputs";
import Color from "color";
import {throttle} from "lodash";
import {MenuComponent} from "../menu.component";

@Component({
	selector: "app-cad-mtext",
	templateUrl: "./cad-mtext.component.html",
	styleUrls: ["./cad-mtext.component.scss"]
})
export class CadMtextComponent extends MenuComponent implements OnInit, OnDestroy {
	data: CadData;

	get selected() {
		return this.cad.selected().mtext;
	}

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.getObservable(getCurrCads).subscribe((currCads) => {
			this.data = getCurrCadsData(this.cad.data, currCads)[0];
		});
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	getInfo(field: string) {
		const selected = this.selected;
		if (selected.length === 1) {
			return selected[0][field];
		}
		if (selected.length) {
			const texts = Array.from(new Set(selected.map((v) => v[field])));
			if (texts.length === 1) {
				return texts[0];
			}
			return "多个值";
		}
		return "";
	}

	// tslint:disable-next-line: member-ordering
	setInfo = throttle((field: string, event: InputEvent) => {
		const value = (event.target as HTMLInputElement).value;
		this.selected.forEach((e) => (e[field] = value));
		this.cad.render();
	}, 500);

	getColor() {
		const selected = this.selected;
		let color = new Color(0);
		if (selected.length === 1) {
			color = new Color(selected[0].color);
		}
		if (selected.length) {
			const texts = Array.from(new Set(selected.map((v) => v.color.hex())));
			if (texts.length === 1) {
				color = new Color(selected[0].color);
			}
		}
		return color.string();
	}

	setColor(event: ColorPickerEventArgs) {
		const value = event.currentValue.hex;
		this.selected.forEach((e) => (e.color = new Color(value)));
		this.cad.render();
	}

	addMtext() {
		const {cad, data} = this;
		const mtext = new CadMtext();
		const {cx, cy} = cad.draw.viewbox();
		mtext.insert.set(cx, cy);
		mtext.anchor.set(0.5, 0.5);
		mtext.text = "新建文本";
		mtext.selected = true;
		data.entities.mtext.push(mtext);
		cad.render(mtext);
	}

	async cloneMtexts() {
		const {cad, data} = this;
		this.selected.forEach((mtext) => {
			const newText = mtext.clone(true);
			data.entities.mtext.push(newText);
		});
		cad.render();
	}
}
