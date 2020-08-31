import {SVG, Svg, CoordinateXY} from "@svgdotjs/svg.js";
import {drawArc, drawCircle, drawLine, drawText} from "./draw";
import {cloneDeep} from "lodash";
import {CadData} from "./cad-data/cad-data";
import {CadEntities} from "./cad-data/cad-entities";
import {CadArc} from "./cad-data/cad-entity/cad-arc";
import {CadCircle} from "./cad-data/cad-entity/cad-circle";
import {CadDimension} from "./cad-data/cad-entity/cad-dimension";
import {CadEntity} from "./cad-data/cad-entity/cad-entity";
import {CadHatch} from "./cad-data/cad-entity/cad-hatch";
import {CadLine} from "./cad-data/cad-entity/cad-line";
import {CadMtext} from "./cad-data/cad-entity/cad-mtext";
import {CadStyle} from "./cad-stylizer";
import {CadStylizer} from "./cad-stylizer";
import {EventEmitter} from "events";
import {Point} from "../utils";
import Color from "color";
import {CadEvents, controls} from "./cad-viewer-controls";
import html2canvas from "html2canvas";
import {timeout} from "../app.common";

export interface CadViewerConfig {
	width: number;
	height: number;
	backgroundColor: Color;
	showLineLength: number;
	showGongshi: number;
	padding: number[] | number;
	showStats: boolean;
	reverseSimilarColor: boolean;
	validateLines: boolean;
	selectMode: "none" | "single" | "multiple";
	dragAxis: "" | "x" | "y" | "xy";
}

export class CadViewer extends EventEmitter {
	data: CadData;
	config: CadViewerConfig = {
		width: 300,
		height: 150,
		backgroundColor: new Color(),
		showLineLength: 0,
		showGongshi: 0,
		padding: [0],
		showStats: false,
		reverseSimilarColor: true,
		validateLines: false,
		selectMode: "multiple",
		dragAxis: "xy"
	};
	dom: HTMLDivElement;
	draw: Svg;
	stylizer: CadStylizer;
	status: {pointer: {from: Point; to: Point}; button: number; multiSelector: HTMLDivElement} = {
		pointer: null,
		button: -1,
		multiSelector: null
	};

	constructor(data: CadData, config: Partial<CadViewerConfig> = {}) {
		super();
		this.data = data;
		this.config = {...this.config, ...config};

		const dom = document.createElement("div");
		dom.id = data.id;
		dom.setAttribute("name", data.name);
		dom.classList.add("cad-viewer");
		dom.id = data.id;
		dom.setAttribute("name", data.name);
		dom.classList.add("cad-viewer");
		this.dom = dom;
		this.draw = SVG().addTo(dom).size("100%", "100%");
		this.stylizer = new CadStylizer(this);

		this.resize().setBackgroundColor();
		this.render(true);

		dom.addEventListener("wheel", controls.onWheel.bind(this));
		dom.addEventListener("click", controls.onClick.bind(this));
		dom.addEventListener("pointerdown", controls.onPointerDown.bind(this));
		dom.addEventListener("pointermove", controls.onPointerMove.bind(this));
		dom.addEventListener("pointerup", controls.onPointerUp.bind(this));
		dom.addEventListener("keydown", controls.onKeyDown.bind(this));
		dom.tabIndex = 0;
		dom.focus();
	}

	appendTo(container: HTMLElement) {
		container.appendChild(this.dom);
		return this;
	}

	width(): number;
	width(value: number | string): this;
	width(value?: number | string) {
		if (value === undefined) {
			return this.draw.attr("width") as number;
		}
		this.draw.attr("width", value);
		return this;
	}

	height(): number;
	height(value: number | string): this;
	height(value?: number | string) {
		if (value === undefined) {
			return this.draw.attr("height") as number;
		}
		this.draw.attr("height", value);
		return this;
	}

	x(): number;
	x(value: number): this;
	x(value?: number) {
		const box = this.draw.viewbox();
		if (typeof value === "number" && !isNaN(value)) {
			box.x = value;
			this.draw.viewbox(box);
			return this;
		} else {
			return box.x;
		}
	}

	y(): number;
	y(value: number): this;
	y(value?: number) {
		const box = this.draw.viewbox();
		if (typeof value === "number" && !isNaN(value)) {
			box.y = value;
			this.draw.viewbox(box);
			return this;
		} else {
			return box.y;
		}
	}

	xy(): {x: number; y: number};
	xy(x: number, y: number): this;
	xy(x?: number, y?: number) {
		const box = this.draw.viewbox();
		if (typeof x === "number" && typeof y === "number") {
			box.x = x;
			box.y = y;
			this.draw.viewbox(box);
			return this;
		} else {
			return {x: box.x, y: box.y};
		}
	}

	dx(value = 0) {
		return this.x(this.x() - value);
	}

	dy(value = 0) {
		return this.y(this.y() + value);
	}

	move(dx = 0, dy = 0, entities?: CadEntities) {
		if (entities instanceof CadEntities) {
		} else {
			const box = this.draw.viewbox();
			box.x -= dx;
			box.y += dy;
			this.draw.viewbox(box);
		}

		return this;
	}

	zoom(level?: number, point?: CoordinateXY) {
		// ? zoom method is somehow hidden
		const result = (this.draw as any).zoom(level, point);
		if (isNaN(result)) {
			return 1;
		}
		return result;
	}

	resize(width?: number, height?: number) {
		const {draw, config} = this;
		if (width > 0) {
			config.width = width;
		} else {
			width = config.width;
		}
		if (height > 0) {
			config.height = height;
		} else {
			height = config.height;
		}
		draw.attr({width, height});
		this.dom.style.width = width + "px";
		this.dom.style.height = height + "px";

		let padding = this.config.padding;
		if (typeof padding === "number") {
			padding = [padding, padding, padding, padding];
		} else if (!Array.isArray(padding) || padding.length === 0) {
			padding = [0, 0, 0, 0];
		} else if (padding.length === 0) {
			padding = [0, 0, 0, 0];
		} else if (padding.length === 1) {
			padding = [padding[0], padding[0], padding[0], padding[0]];
		} else if (padding.length === 2) {
			padding = [padding[0], padding[1], padding[0], padding[1]];
		} else if (padding.length === 3) {
			padding = [padding[0], padding[1], padding[0], padding[2]];
		}
		// draw.css("padding", padding.map((v) => v + "px").join(" "));
		this.config.padding = padding;

		return this;
	}

	setBackgroundColor(color?: Color) {
		if (!color) {
			color = this.config.backgroundColor;
		}
		this.draw.css("background-color", color.toString());
	}

	drawEntity(entity: CadEntity, style: CadStyle = {}) {
		const {draw, stylizer} = this;
		const {color, linewidth} = stylizer.get(entity, style);
		const drawType = Array<"fill" | "stroke">();
		if (entity.el) {
			entity.el.clear();
		} else {
			entity.el = draw.group().addClass("selectable");
		}
		const el = entity.el;
		if (entity instanceof CadArc) {
			const {center, radius, start_angle, end_angle, clockwise} = entity;
			drawArc(el.clear(), center, radius, start_angle, end_angle, clockwise);
			drawType.push("stroke");
		} else if (entity instanceof CadCircle) {
			const {center, radius} = entity;
			drawCircle(el.clear(), center, radius);
			drawType.push("stroke");
		} else if (entity instanceof CadDimension) {
			const {mingzi, qujian, font_size, axis} = entity;
			const [p1, p2, p3, p4, p5, p6, p7, p8] = this.data.getDimensionPoints(entity);
			drawLine(el, p1, p3);
			drawLine(el, p3, p4);
			drawLine(el, p4, p2);
			el.path(`M${p3.x} ${p3.y} L${p5.x} ${p5.y} L${p6.x} ${p6.y}`).fill(color);
			el.path(`M${p4.x} ${p4.y} L${p7.x} ${p7.y} L${p8.x} ${p8.y}`).fill(color);
			let text = "";
			if (mingzi) {
				text = mingzi;
			}
			if (qujian) {
				text = qujian;
			}
			if (text === "") {
				text = "<>";
			}
			text = text.replace("<>", p3.distanceTo(p4).toFixed(2));
			const middle = p3.clone().add(p4).divide(2);
			if (axis === "x") {
				drawText(entity.el, text, font_size, middle, new Point(0.5, 1));
			} else if (axis === "y") {
				drawText(entity.el, text, font_size, middle, new Point(0, 0.5), true);
			}
			drawType.push("fill", "stroke");
		} else if (entity instanceof CadHatch) {
		} else if (entity instanceof CadLine) {
			const {start, end} = entity;
			drawLine(el, start, end);
			drawType.push("stroke");
		} else if (entity instanceof CadMtext) {
			const {text, insert, font_size, anchor} = entity;
			drawText(el, text, font_size, insert, anchor);
			drawType.push("fill");
		}
		el.attr({id: entity.id, type: entity.type});
		if (drawType.includes("fill")) {
			el.fill(color);
			el.addClass("fill");
		}
		if (drawType.includes("stroke")) {
			el.stroke({width: linewidth, color});
			el.children().forEach((c) => c.attr("vector-effect", "non-scaling-stroke"));
			el.addClass("stroke");
		}
		el.node.onclick = (event) => {
			controls.onEntityClick.call(this, event, entity);
		};
		entity.children.forEach((c) => this.drawEntity(c, style));
	}

	render(center = false, entities?: CadEntities | CadEntity[], style: CadStyle = {}) {
		if (!entities) {
			entities = this.data.getAllEntities();
		}
		if (center) {
			this.center();
		}
		entities.forEach((e) => this.drawEntity(e, style));
	}

	center() {
		let {width, height, x, y} = this.data.getBoundingRect();
		const outerWidth = this.width();
		const outerHeight = this.height();
		const padding = cloneDeep(this.config.padding) as number[];
		const scaleX = (outerWidth - padding[1] - padding[3]) / width;
		const scaleY = (outerHeight - padding[0] - padding[2]) / height;
		const scale = Math.min(scaleX, scaleY);
		for (let i = 0; i < padding.length; i++) {
			padding[i] /= scale;
		}
		let outterWidth = width + padding[1] + padding[3];
		let outterHeight = height + padding[0] + padding[2];
		const ratio = outerWidth / outerHeight;
		if (ratio > outterWidth / outterHeight) {
			outterWidth = outterHeight * ratio;
			width = outterWidth - padding[1] - padding[3];
		} else {
			outterHeight = outterWidth / ratio;
			height = outterHeight - padding[0] - padding[2];
		}
		x = x - width / 2 - padding[3];
		y = y - height / 2 - padding[2];
		this.draw.viewbox(x, y, outterWidth, outterHeight);
		this.draw.transform({a: 1, b: 0, c: 0, d: -1, e: 0, f: 0});
		return this.resize();
	}

	addEntity(...entities: CadEntity[]) {
		this.data.entities.add(...entities);
		return this.render(false, entities);
	}

	removeEntity(...entities: CadEntity[]) {
		entities.forEach((e) => e.el?.remove());
		this.data.entities.remove(...entities);
		return this;
	}

	selected() {
		return this.data.getAllEntities().filter((e) => e.selected);
	}

	unselected() {
		return this.data.getAllEntities().filter((e) => !e.selected);
	}

	select(entities: CadEntities | CadEntity | CadEntity[]) {
		if (entities instanceof CadEntity) {
			return this.select(new CadEntities().add(entities));
		}
		if (Array.isArray(entities)) {
			return this.select(new CadEntities().fromArray(entities));
		}
		entities.forEach((e) => (e.selected = true));
		this.emit("entitiesselect", null, entities);
		return this;
	}

	unselect(entities: CadEntities | CadEntity | CadEntity[]) {
		if (entities instanceof CadEntity) {
			return this.unselect(new CadEntities().add(entities));
		}
		if (Array.isArray(entities)) {
			return this.unselect(new CadEntities().fromArray(entities));
		}
		entities.forEach((e) => (e.selected = false));
		this.emit("entitiesunselect", null, entities);
		return this;
	}

	selectAll() {
		return this.select(this.data.getAllEntities());
	}

	unselectAll() {
		return this.unselect(this.data.getAllEntities());
	}

	remove(entities: CadEntities | CadEntity | CadEntity[]) {
		if (entities instanceof CadEntity) {
			return this.remove(new CadEntities().add(entities));
		}
		if (Array.isArray(entities)) {
			return this.remove(new CadEntities().fromArray(entities));
		}
		const data = new CadData();
		data.entities = entities;
		entities.forEach((e) => {
			e.parent?.remove(e);
			e.el?.remove();
			e.el = null;
		});
		this.data.separate(data);
		this.emit("entitiesremove", null, entities);
		return this;
	}

	add(entities: CadEntities | CadEntity | CadEntity[]) {
		if (entities instanceof CadEntity) {
			return this.add(new CadEntities().add(entities));
		}
		if (Array.isArray(entities)) {
			return this.add(new CadEntities().fromArray(entities));
		}
		this.emit("entitiesadd", null, entities);
		return this;
	}

	getWorldPoint(x: number, y: number) {
		const {height} = this.draw.node.getBoundingClientRect();
		const box = this.draw.viewbox();
		const result = new Point();
		const zoom = this.zoom();
		result.x = x / zoom + box.x;
		result.y = (height - y) / zoom + box.y;
		return result;
	}

	emit<K extends keyof CadEvents>(type: K, event: CadEvents[K][0], entities?: CadEvents[K][1]) {
		return super.emit(type, event, entities);
	}

	on<K extends keyof CadEvents>(type: K, listener: (event: CadEvents[K][0], entity?: CadEvents[K][1]) => void) {
		return super.on(type, listener);
	}

	off<K extends keyof CadEvents>(
		type: K,
		listener: (event: CadEvents[K][0], entity?: CadEvents[K][1], object?: CadEvents[K][2]) => void
	) {
		return super.off(type, listener);
	}

	toBase64() {
		let str = new XMLSerializer().serializeToString(this.draw.node);
		str = unescape(encodeURIComponent(str));
		return "data:image/svg+xml;base64," + window.btoa(str);
	}

	toCanvas() {
		const img = new Image();
		img.src = this.toBase64();
		return new Promise<HTMLCanvasElement>((resolve) => {
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0);
				resolve(canvas);
			};
		});
	}

	traverse(callback: (e: CadEntity) => void) {
		this.data.getAllEntities().forEach((e) => callback(e));
		return this;
	}

	destroy() {
		this.data = new CadData();
		this.dom.remove();
		this.dom = null;
		return this;
	}

	reset(data?: CadData, center = false) {
		this.draw.clear();
		if (data instanceof CadData) {
			this.data = data;
		}
		this.traverse((e) => {
			e.el = null;
			e.children.forEach((c) => (c.el = null));
		});
		return this.render(center);
	}
}
