import {Component, OnInit, Input, OnDestroy, Injector} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer-legacy";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {Vector2} from "three";
import {CadArc} from "@src/app/cad-viewer/cad-data/cad-entity/cad-arc";
import {
	generatePointsMap,
	validateLines,
	getPointsFromMap,
	setLinesLength,
	autoFixLine,
	updateLineTexts
} from "@src/app/cad-viewer/cad-data/cad-lines";
import {getColorLightness} from "@app/utils";
import {MatSelectChange} from "@angular/material/select";
import {linewidth2lineweight, lineweight2linewidth} from "@src/app/cad-viewer/cad-data/utils";
import {MenuComponent} from "../menu.component";
import {CadStatusAction, CadPointsAction} from "@src/app/store/actions";
import {getCadPoints, getCadStatus, getCurrCads, getCurrCadsData} from "@src/app/store/selectors";
import {takeUntil} from "rxjs/operators";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";
import {CadViewerControlsConfig} from "@src/app/cad-viewer/cad-viewer-controls-legacy";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {State} from "@src/app/store/state";
import Color from "color";

@Component({
	selector: "app-cad-line",
	templateUrl: "./cad-line.component.html",
	styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent extends MenuComponent implements OnInit, OnDestroy {
	@Input() cad: CadViewer;
	focusedField = "";
	editDiabled = true;
	lineDrawing: {start: Vector2; end: Vector2; entity?: CadLine};
	data: CadData;
	cadStatusName: State["cadStatus"]["name"];

	get selected() {
		const {line, arc} = this.cad.selectedEntities;
		return [...line, ...arc];
	}
	readonly selectableColors = {a: ["#ffffff", "#ff0000", "#00ff00", "#0000ff"]};

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		const cad = this.cad;
		const controls = cad.controls;
		controls.on("entityselect", this.updateEditDisabled.bind(this));
		controls.on("entitiesselect", this.updateEditDisabled.bind(this));

		this.getObservable(getCurrCads).subscribe((currCads) => {
			const cads = getCurrCadsData(this.cad.data, currCads);
			if (cads.length === 1) {
				this.data = cads[0];
			} else {
				this.data = null;
			}
		});

		let prevSelectMode: CadViewerControlsConfig["selectMode"];
		this.getObservable(getCadStatus).subscribe(({name}) => {
			const {cad, store, data} = this;
			this.cadStatusName = name;
			if (name === "draw line") {
				const points = getPointsFromMap(cad, generatePointsMap(data.getAllEntities()));
				store.dispatch<CadPointsAction>({type: "set cad points", points});
				cad.traverse((e) => {
					e.info.prevSelectable = e.selectable;
					e.selectable = false;
				});
				prevSelectMode = cad.controls.config.selectMode;
				cad.controls.config.selectMode = "none";
				this.lineDrawing = {start: null, end: null};
			} else if (this.lineDrawing) {
				store.dispatch<CadPointsAction>({type: "set cad points", points: []});
				cad.removeEntity(this.lineDrawing.entity);
				cad.traverse((e) => {
					e.selectable = e.info.prevSelectable ?? true;
					delete e.info.prevSelectable;
				});
				cad.controls.config.selectMode = prevSelectMode;
				this.lineDrawing = null;
			}
		});
		const cadPoints = this.store.select(getCadPoints);
		cadPoints.pipe(takeUntil(this.destroyed)).subscribe(async (points) => {
			const index = points.findIndex((v) => v.active);
			const point = points[index];
			const {name} = await this.getObservableOnce(getCadStatus);
			if (!point || name !== "draw line") {
				return;
			}
			const start = cad.getWorldPoint(new Vector2(point.x, point.y));
			this.lineDrawing = {start, end: null};
			this.store.dispatch<CadPointsAction>({type: "set cad points", points: []});
		});

		cad.dom.addEventListener("mousemove", this.onMouseMove.bind(this));
		cad.dom.addEventListener("click", this.onClick.bind(this));
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		const cad = this.cad;
		const controls = cad.controls;
		controls.off("entityselect", this.updateEditDisabled.bind(this));
		controls.off("entitiesselect", this.updateEditDisabled.bind(this));
		cad.dom.removeEventListener("mousemove", this.onMouseMove.bind(this));
		cad.dom.removeEventListener("click", this.onClick.bind(this));
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
		const {selected, cad} = this;
		const lines = selected.filter((v) => v instanceof CadLine) as CadLine[];
		setLinesLength(cad, lines, Number((event.target as HTMLInputElement).value));
		if (cad.config.validateLines) {
			validateLines(cad.data);
		}
		updateLineTexts(this.cad);
		cad.render();
	}

	getCssColor(colorStr?: string) {
		const lines = this.selected;
		if (colorStr) {
			const color = new Color(colorStr);
			return getColorLightness(color.hex()) < 0.5 ? "black" : "white";
		}
		if (lines.length === 1) {
			return "#" + lines[0].color.hex();
		}
		if (lines.length) {
			const strs = Array.from(new Set(lines.map((l) => "#" + l.color.hex())));
			if (strs.length === 1) {
				return strs[0];
			}
		}
		return "#ffffff";
	}

	setLineColor(event: MatSelectChange) {
		const color = parseInt(event.value.slice(1, 7), 16);
		this.selected.forEach((e) => (e.color = new Color(color)));
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
		let value: string | number;
		if (event instanceof MatSelectChange) {
			value = event.value;
		} else {
			value = (event.target as HTMLInputElement).value;
		}
		if (field === "zidingzhankaichang") {
			value = Number(value);
		}
		this.selected.forEach((e) => {
			if (e instanceof CadLine) {
				e[field] = value;
			}
		});
		if (field === "gongshi") {
			updateLineTexts(this.cad);
			this.cad.render();
		}
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

	async drawLine() {
		const {name} = await this.getObservableOnce(getCadStatus);
		if (name === "draw line") {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		} else {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "draw line"});
		}
	}

	async onMouseMove({clientX, clientY, shiftKey}: MouseEvent) {
		const {cad, lineDrawing} = this;
		if (!lineDrawing?.start) {
			return;
		}
		lineDrawing.end = cad.getWorldPoint(new Vector2(clientX, clientY));
		if (shiftKey) {
			const dx = Math.abs(lineDrawing.start.x - lineDrawing.end.x);
			const dy = Math.abs(lineDrawing.start.y - lineDrawing.end.y);
			if (dx < dy) {
				lineDrawing.end.x = lineDrawing.start.x;
			} else {
				lineDrawing.end.y = lineDrawing.start.y;
			}
		}
		let entity = lineDrawing.entity;
		if (entity) {
			entity.end = lineDrawing.end;
		} else {
			entity = new CadLine({...lineDrawing});
			entity.opacity = 0.7;
			entity.selectable = false;
			lineDrawing.entity = entity;
			this.data.entities.add(entity);
		}
		cad.render(false, new CadEntities().add(entity));
	}

	onClick() {
		const {store, lineDrawing, cad} = this;
		const entity = lineDrawing?.entity;
		if (!entity) {
			return;
		}
		entity.opacity = 1;
		entity.selectable = true;
		setLinesLength(this.cad, [entity], Math.round(entity.length));
		cad.render(false, new CadEntities().add(entity));
		// this.lineDrawing.entity=null
		this.lineDrawing = {start: null, end: null};
		const points = getPointsFromMap(cad, generatePointsMap(this.data.getAllEntities()));
		store.dispatch<CadPointsAction>({type: "set cad points", points});
	}

	autoFix() {
		const {selected, cad} = this;
		selected.forEach((e) => {
			if (e instanceof CadLine) {
				autoFixLine(this.cad, e);
			}
		});
		if (cad.config.validateLines) {
			validateLines(cad.data);
		}
		cad.render();
	}
}
