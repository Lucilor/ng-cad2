import {Component, OnInit, Input, OnDestroy} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {Vector2, Color} from "three";
import {CadArc} from "@src/app/cad-viewer/cad-data/cad-entity/cad-arc";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {findAllAdjacentLines, generatePointsMap, validateLines} from "@src/app/cad-viewer/cad-data/cad-lines";
import {getColorLightness} from "@lucilor/utils";
import {MatSelectChange} from "@angular/material/select";
import {linewidth2lineweight, lineweight2linewidth} from "@src/app/cad-viewer/cad-data/utils";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";

@Component({
	selector: "app-cad-line",
	templateUrl: "./cad-line.component.html",
	styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent implements OnInit, OnDestroy {
	@Input() cad: CadViewer;
	focusedField = "";
	editDiabled = true;
	get selected() {
		const {line, arc} = this.cad.selectedEntities;
		return [...line, ...arc];
	}
	readonly selectableColors = {a: ["#ffffff", "#ff0000", "#00ff00", "#0000ff"]};

	constructor() {}

	ngOnInit() {
		const controls = this.cad.controls;
		controls.on("entityselect", this.updateEditDisabled.bind(this));
		controls.on("entitiesselect", this.updateEditDisabled.bind(this));
	}

	ngOnDestroy() {
		const controls = this.cad.controls;
		controls.off("entityselect", this.updateEditDisabled.bind(this));
		controls.off("entitiesselect", this.updateEditDisabled.bind(this));
	}

	updateEditDisabled() {
		const selected = this.selected;
		if (selected.length < 1) {
			this.editDiabled = false;
			return;
		}
		const cads = this.cad.data.components.data;
		const ids = Array<string>();
		cads.forEach((v) => v.entities.forEach((vv) => ids.push(vv.id)));
		this.editDiabled = !selected.every((e) => ids.includes(e.id));
	}

	expandLine(line: CadLine, d: number) {
		const theta = line.theta;
		const translate = new Vector2(Math.cos(theta), Math.sin(theta)).multiplyScalar(d);
		line.end.add(translate);
		return translate;
	}

	getLineLength() {
		const lines = this.selected;
		if (lines.length === 1) {
			const line = lines[0];
			if (line instanceof CadLine) {
				return line.length.toFixed(2);
			} else if (line instanceof CadArc) {
				return line.curve.getLength().toFixed(2);
			}
		}
		return "";
	}

	setLineLength(event: InputEvent) {
		const {selected: selectedLines, cad} = this;
		const pointsMap = generatePointsMap(cad.data.getAllEntities());
		selectedLines.forEach((line) => {
			if (line instanceof CadLine) {
				const {entities, closed} = findAllAdjacentLines(pointsMap, line, line.end);
				const length = Number((event.target as HTMLInputElement).value);
				const d = line.length - length;
				const translate = this.expandLine(line, d);
				entities.forEach((e) => e.transform(new CadTransformation({translate})));
			}
		});
		cad.data.updatePartners().updateComponents();
		cad.data.components.data.forEach((v) => validateLines(v));
		cad.render();
	}

	getCssColor(colorStr?: string) {
		const lines = this.selected;
		if (colorStr) {
			const color = new Color(colorStr);
			return getColorLightness(color.getHex()) < 0.5 ? "black" : "white";
		}
		if (lines.length === 1) {
			return "#" + lines[0].color.getHexString();
		}
		if (lines.length) {
			const strs = Array.from(new Set(lines.map((l) => "#" + l.color.getHexString())));
			if (strs.length === 1) {
				return strs[0];
			}
		}
		return "#ffffff";
	}

	setLineColor(event: MatSelectChange) {
		const color = parseInt(event.value.slice(1, 7), 16);
		this.selected.forEach((e) => e.color.set(color));
		this.cad.render();
	}

	getLineText(field: string) {
		const lines = this.selected;
		if (lines.length === 1) {
			return lines[0][field];
		}
		if (lines.length) {
			const texts = Array.from(new Set(lines.map((l) => l[field])));
			if (texts.length === 1) {
				return texts[0];
			}
			return field === this.focusedField ? "" : "多个值";
		}
		return "";
	}

	setLineText(event: InputEvent | MatSelectChange, field: string) {
		let value: string;
		if (event instanceof MatSelectChange) {
			value = event.value;
		} else {
			value = (event.target as HTMLInputElement).value;
		}
		this.selected.forEach((e) => {
			if (e instanceof CadLine) {
				e[field] = value;
			}
		});
	}

	getLinewidth() {
		const lines = this.selected;
		if (lines.length === 1) {
			return linewidth2lineweight(lines[0].linewidth).toString();
		}
		if (lines.length) {
			const texts = Array.from(new Set(lines.map((l) => l.linewidth)));
			if (texts.length === 1) {
				return linewidth2lineweight(texts[0]).toString();
			}
			return "多个值";
		}
		return "";
	}

	setLinewidth(event: InputEvent) {
		this.selected.forEach((entity) => {
			const width = Number((event.target as HTMLInputElement).value);
			entity.linewidth = lineweight2linewidth(width);
		});
		this.cad.render();
	}
}
