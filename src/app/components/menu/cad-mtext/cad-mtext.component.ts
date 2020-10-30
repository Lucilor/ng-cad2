import {Component, OnInit, OnDestroy} from "@angular/core";
import {CadData} from "@app/cad-viewer/cad-data/cad-data";
import {CadEntity, CadMtext} from "@src/app/cad-viewer/cad-data/cad-entities";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {AppStatusService} from "@src/app/services/app-status.service";
import {Point} from "@src/app/utils";
import {ColorPickerEventArgs} from "@syncfusion/ej2-angular-inputs";
import Color from "color";
import {debounce} from "lodash";
import {AnchorEvent} from "../../anchor-selector/anchor-selector.component";

@Component({
	selector: "app-cad-mtext",
	templateUrl: "./cad-mtext.component.html",
	styleUrls: ["./cad-mtext.component.scss"]
})
export class CadMtextComponent extends Subscribed() implements OnInit, OnDestroy {
	data?: CadData;
	selected: CadMtext[] = [];
	currAnchor = new Point();

	private updateSelected = (() => (this.selected = this.status.cad.selected().mtext)).bind(this);

	constructor(private status: AppStatusService) {
		super();
	}

	ngOnInit() {
		this.subscribe(this.status.selectedCads$, () => {
			this.data = this.status.getFlatSelectedCads()[0];
		});
		this.updateSelected();
		const cad = this.status.cad;
		cad.on("entitiesselect", this.updateSelected);
		cad.on("entitiesunselect", this.updateSelected);
		cad.on("entitiesadd", this.updateSelected);
		cad.on("entitiesremove", this.updateSelected);
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		const cad = this.status.cad;
		cad.off("entitiesselect", this.updateSelected);
		cad.off("entitiesunselect", this.updateSelected);
		cad.off("entitiesadd", this.updateSelected);
		cad.off("entitiesremove", this.updateSelected);
	}

	getInfo(field: string) {
		const selected = this.selected;
		if (selected.length === 1) {
			return (selected[0] as any)[field];
		}
		if (selected.length) {
			const texts = Array.from(new Set(selected.map((v: any) => v[field])));
			if (texts.length === 1) {
				return texts[0];
			}
			return "多个值";
		}
		return "";
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	setInfo = debounce((field: string, event: Event) => {
		const value = (event.target as HTMLInputElement).value;
		this.selected.forEach((e: any) => (e[field] = value));
		this.status.cad.render(this.selected);
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
		return color.hex();
	}

	setColor(event: ColorPickerEventArgs) {
		const value = event.currentValue.hex;
		this.selected.forEach((e) => (e.color = new Color(value)));
		this.status.cad.render(this.selected);
	}

	addMtext() {
		const cad = this.status.cad;
		const mtext = new CadMtext();
		const {cx, cy} = cad.draw.viewbox();
		mtext.insert.set(cx, cy);
		mtext.anchor.set(0.5, 0.5);
		mtext.text = "新建文本";
		mtext.selected = true;
		this.data?.entities.mtext.push(mtext);
		cad.render(mtext);
	}

	async cloneMtexts() {
		const cad = this.status.cad;
		const toRender: CadEntity[] = [];
		this.selected.forEach((mtext) => {
			const newText = mtext.clone(true);
			this.data?.entities.mtext.push(newText);
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
		this.status.cad.render(this.selected);
	}
}
