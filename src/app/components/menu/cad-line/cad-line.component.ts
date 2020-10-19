import {Component, OnInit, OnDestroy, Injector} from "@angular/core";
import {CadViewerConfig} from "@app/cad-viewer/cad-viewer";
import {generatePointsMap, validateLines, setLinesLength, autoFixLine, CadLineLike, validColors} from "@app/cad-viewer/cad-data/cad-lines";
import {Point} from "@app/utils";
import {MatSelectChange} from "@angular/material/select";
import {linewidth2lineweight, lineweight2linewidth} from "@app/cad-viewer/cad-data/utils";
import {MenuComponent} from "../menu.component";
import {CadPointsAction, CommandAction} from "@app/store/actions";
import {getCadPoints, getCadStatus, getCurrCads, getCurrCadsData} from "@app/store/selectors";
import {takeUntil} from "rxjs/operators";
import {CadData} from "@app/cad-viewer/cad-data/cad-data";
import {State} from "@app/store/state";
import {ErrorStateMatcher} from "@angular/material/core";
import Color from "color";
import {CadLine, CadArc, CadMtext} from "@app/cad-viewer/cad-data/cad-entity";
import {throttle} from "lodash";
import {getPointsFromMap, globalVars} from "@app/app.common";
import {openCadLineTiaojianquzhiDialog} from "../cad-line-tiaojianquzhi/cad-line-tiaojianquzhi.component";
import {openMessageDialog} from "../../message/message.component";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";

@Component({
	selector: "app-cad-line",
	templateUrl: "./cad-line.component.html",
	styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent extends MenuComponent implements OnInit, OnDestroy {
	focusedField = "";
	editDiabled = true;
	lineDrawing: {start: Point; end: Point; entity?: CadLine};
	data: CadData;
	cadStatusName: State["cadStatus"]["name"];
	inputErrors: {gongshi: string; guanlianbianhuagongshi: string} = {
		gongshi: null,
		guanlianbianhuagongshi: null
	};
	gongshiMatcher: ErrorStateMatcher = {
		isErrorState: () => {
			return !!this.inputErrors.gongshi;
		}
	};
	guanlianbianhuagongshiMatcher: ErrorStateMatcher = {
		isErrorState: () => {
			return !!this.inputErrors.guanlianbianhuagongshi;
		}
	};
	selected: CadLineLike[] = [];

	readonly selectableColors = {a: validColors};

	onPointerMove = (async ({clientX, clientY, shiftKey}: MouseEvent) => {
		const {cad, lineDrawing} = this;
		if (!lineDrawing?.start) {
			return;
		}
		lineDrawing.end = cad.getWorldPoint(clientX, clientY);
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
			lineDrawing.entity = entity;
			this.data.entities.add(entity);
			this.cad.render(entity);
			entity.opacity = 0.6;
			entity.selectable = false;
		}
		cad.render(entity);
	}).bind(this);

	onClick = (() => {
		const {store, lineDrawing, cad} = this;
		const entity = lineDrawing?.entity;
		if (!entity) {
			return;
		}
		setLinesLength(this.cad.data, [entity], Math.round(entity.length));
		cad.render(entity);
		// this.lineDrawing.entity=null
		entity.opacity = 1;
		entity.selectable = true;
		this.lineDrawing = {start: null, end: null};
		const points = getPointsFromMap(cad, generatePointsMap(this.data.getAllEntities()));
		store.dispatch<CadPointsAction>({type: "set cad points", points});
	}).bind(this);

	onEntitiesChange = (() => {
		const {line, arc} = this.cad.selected();
		const selected = [...line, ...arc];
		this.selected = selected;
		selected.forEach((e) => {
			if (e instanceof CadLine) {
				["gongshi", "guanlianbianhuagongshi"].forEach((v) => this.validateLineText(v, e[v]));
			}
		});
		if (selected.length < 1) {
			this.editDiabled = true;
		} else {
			const cads = this.cad.data.components.data;
			const ids: string[] = [];
			cads.forEach((v) => v.entities.forEach((vv) => ids.push(vv.id)));
			this.editDiabled = !selected.every((e) => ids.includes(e.id));
		}
	}).bind(this);

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		const cad = this.cad;

		this.getObservable(getCurrCads).subscribe((currCads) => {
			const cads = getCurrCadsData(this.cad.data, currCads);
			if (cads.length === 1) {
				this.data = cads[0];
			} else {
				this.data = null;
			}
		});

		let prevSelectMode: CadViewerConfig["selectMode"];
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
				prevSelectMode = cad.config("selectMode");
				cad.config("selectMode", "none");
				this.lineDrawing = {start: null, end: null};
			} else if (this.lineDrawing) {
				store.dispatch<CadPointsAction>({type: "set cad points", points: []});
				cad.remove(this.lineDrawing.entity);
				cad.traverse((e) => {
					e.selectable = e.info.prevSelectable ?? true;
					delete e.info.prevSelectable;
				});
				cad.config("selectMode", prevSelectMode);
				if (this.lineDrawing?.entity) {
					this.lineDrawing.entity.selectable = true;
				}
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
			const start = cad.getWorldPoint(point.x, point.y);
			this.lineDrawing = {start, end: null};
			this.store.dispatch<CadPointsAction>({type: "set cad points", points: []});
		});

		cad.on("pointermove", this.onPointerMove);
		cad.on("click", this.onClick);
		cad.on("entitiesselect", this.onEntitiesChange);
		cad.on("entitiesunselect", this.onEntitiesChange);
		cad.on("entitiesadd", this.onEntitiesChange);
		cad.on("entitiesremove", this.onEntitiesChange);
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		const cad = this.cad;
		cad.off("pointermove", this.onPointerMove);
		cad.off("click", this.onClick);
		cad.off("entitiesselect", this.onEntitiesChange);
		cad.off("entitiesunselect", this.onEntitiesChange);
		cad.off("entitiesadd", this.onEntitiesChange);
		cad.off("entitiesremove", this.onEntitiesChange);
	}

	getLineLength() {
		const lines = this.selected;
		if (lines.length === 1) {
			const line = lines[0];
			if (line instanceof CadLine) {
				return line.length.toFixed(2);
			} else if (line instanceof CadArc) {
				return line.length.toFixed(2);
			}
		}
		return "";
	}

	setLineLength(event: InputEvent) {
		const {selected, cad} = this;
		const lines = selected.filter((v) => v instanceof CadLine) as CadLine[];
		setLinesLength(cad.data, lines, Number((event.target as HTMLInputElement).value));
		if (cad.config("validateLines")) {
			validateLines(cad.data);
		}
		cad.render();
	}

	getCssColor() {
		const lines = this.selected;
		if (lines.length === 1) {
			return lines[0].color.hex();
		}
		if (lines.length) {
			const strs = Array.from(new Set(lines.map((l) => l.color.hex())));
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
			return lines[0][field] as string;
		}
		if (lines.length) {
			const texts = Array.from(new Set(lines.map((l) => l[field] as string)));
			if (texts.length === 1) {
				return texts[0];
			}
			return field === this.focusedField ? "" : "多个值";
		}
		return "";
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	setLineText = throttle((event: InputEvent | MatSelectChange | Event, field: string) => {
		let value: string;
		if (event instanceof MatSelectChange) {
			value = event.value;
		} else if (event instanceof InputEvent || event instanceof Event) {
			value = (event.target as HTMLInputElement).value;
		}
		if (this.validateLineText(field, value)) {
			this.selected.forEach((e) => {
				if (field === "lengthTextSize") {
					e[field] = Number(value);
					this.cad.render(e);
				} else {
					if (e instanceof CadLine) {
						if (field === "zidingzhankaichang") {
							e[field] = Number(value);
						} else {
							e[field] = value;
							if (field === "gongshi") {
								const gongshiText = e.children.find((c) => c.info.isGongshiText);
								if (gongshiText instanceof CadMtext) {
									gongshiText.text = value;
								}
								this.cad.render(e);
							}
						}
					}
				}
			});
		}
	}, 500);

	validateLineText(field: string, value: string) {
		if (field === "gongshi") {
			if (globalVars.collection === "cad" && value.match(/[-+*/()（）]/)) {
				this.inputErrors.gongshi = "不能使用四则运算";
				return false;
			} else if (value.includes("变化值")) {
				this.inputErrors.gongshi = "公式不能包含变化值";
				return false;
			} else {
				this.inputErrors.gongshi = null;
			}
		} else if (field === "guanlianbianhuagongshi") {
			if (value && !value.includes("变化值")) {
				this.inputErrors.guanlianbianhuagongshi = "关联变化公式必须包含变化值";
				return false;
			} else {
				this.inputErrors.guanlianbianhuagongshi = null;
			}
		}
		return true;
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

	drawLine() {
		this.store.dispatch<CommandAction>({type: "execute", command: {name: "draw-line", args: []}});
	}

	autoFix() {
		const {selected, cad} = this;
		selected.forEach((e) => {
			if (e instanceof CadLine) {
				autoFixLine(this.cad, e);
			}
		});
		if (cad.config("validateLines")) {
			validateLines(cad.data);
		}
		cad.render();
	}

	async editTiaojianquzhi() {
		const lines = this.selected.filter((v) => v instanceof CadLine) as CadLine[];
		if (lines.length < 1) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "请先选中一条直线"}});
		} else if (lines.length > 1) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "无法同时编辑多根线的条件取值"}});
		} else {
			openCadLineTiaojianquzhiDialog(this.dialog, {data: lines[0]});
		}
	}

	getHideLength() {
		return this.selected.some((v) => v.hideLength);
	}

	setHideLength(event: MatSlideToggleChange) {
		this.selected.forEach((v) => (v.hideLength = event.checked));
		this.cad.render(this.selected);
	}
}
