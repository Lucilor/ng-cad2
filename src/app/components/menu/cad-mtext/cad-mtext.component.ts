import {Component, OnInit, OnDestroy, Injector, ElementRef} from "@angular/core";
import {CadData} from "@app/cad-viewer/cad-data/cad-data";
import {CadEntity, CadMtext} from "@app/cad-viewer/cad-data/cad-entity";
import {getCurrCads, getCurrCadsData} from "@app/store/selectors";
import {Point} from "@src/app/utils";
import {ColorPickerEventArgs} from "@syncfusion/ej2-angular-inputs";
import Color from "color";
import {throttle} from "lodash";
import {AnchorEvent} from "../../anchor-selector/anchor-selector.component";
import {MenuComponent} from "../menu.component";

@Component({
	selector: "app-cad-mtext",
	templateUrl: "./cad-mtext.component.html",
	styleUrls: ["./cad-mtext.component.scss"]
})
export class CadMtextComponent extends MenuComponent implements OnInit, OnDestroy {
	data: CadData;
	currAnchor = new Point();

	get selected() {
		return this.cad.selected().mtext;
	}

	constructor(injector: Injector, private elRef: ElementRef<HTMLElement>) {
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

	// eslint-disable-next-line @typescript-eslint/member-ordering
	setInfo = throttle((field: string, event: InputEvent) => {
		const value = (event.target as HTMLInputElement).value;
		this.selected.forEach((e) => (e[field] = value));
		this.cad.render(this.selected);
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
		return "#" + color.rgbNumber;
	}

	setColor(event: ColorPickerEventArgs) {
		const value = event.currentValue.hex;
		this.selected.forEach((e) => (e.color = new Color(value)));
		this.cad.render(this.selected);
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
		const toRender: CadEntity[] = [];
		this.selected.forEach((mtext) => {
			const newText = mtext.clone(true);
			data.entities.mtext.push(newText);
			toRender.push(newText);
		});
		cad.render(toRender);
	}

	getAnchor() {
		const selected = this.selected;
		const anchor = new Point();
		if (selected.length === 1) {
			anchor.copy(selected[0].anchor);
		}
		this.currAnchor.copy(anchor);
		return anchor.toArray().join(", ");
	}

	setAnchor(event: AnchorEvent) {
		const [x, y] = event.anchor;
		this.selected.forEach((e) => e.anchor.set(x, y));
		this.cad.render(this.selected);
	}
}
