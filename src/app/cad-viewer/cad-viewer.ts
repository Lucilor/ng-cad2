import {SVG, Svg, CoordinateXY, Element} from "@svgdotjs/svg.js";
import Color from "color";
import {EventEmitter} from "events";
import {cloneDeep, result} from "lodash";
import {Point} from "../utils";
import {CadData} from "./cad-data/cad-data";
import {CadEntities} from "./cad-data/cad-entities";
import {CadEntity, CadArc, CadCircle, CadDimension, CadHatch, CadLine, CadMtext} from "./cad-data/cad-entity";
import {getVectorFromArray} from "./cad-data/utils";
import {CadStyle, CadStylizer} from "./cad-stylizer";
import {CadEvents, controls} from "./cad-viewer-controls";
import {drawArc, drawCircle, drawDimension, drawLine, drawText} from "./draw";

export interface CadViewerConfig {
	width: number;
	height: number;
	backgroundColor: Color;
	lineTexts: {lineLength: number; gongshi: number};
	padding: number[] | number;
	showStats: boolean;
	reverseSimilarColor: boolean;
	validateLines: boolean;
	selectMode: "none" | "single" | "multiple";
	dragAxis: "" | "x" | "y" | "xy";
	entityDraggable: boolean;
}

export class CadViewer extends EventEmitter {
	data: CadData;
	config: CadViewerConfig = {
		width: 300,
		height: 150,
		backgroundColor: new Color(),
		lineTexts: {lineLength: 0, gongshi: 0},
		padding: [0],
		showStats: false,
		reverseSimilarColor: true,
		validateLines: false,
		selectMode: "multiple",
		dragAxis: "xy",
		entityDraggable: true
	};
	dom: HTMLDivElement;
	draw: Svg;
	stylizer: CadStylizer;

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
		this.render();

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
			if (x || y) {
				box.x = x;
				box.y = y;
				this.draw.viewbox(box);
			}
			return this;
		} else {
			return {x: box.x, y: box.y};
		}
	}

	dx(value = 0) {
		return this.x(this.x() - value);
	}

	dy(value = 0) {
		return this.y(this.y() - value);
	}

	move(dx = 0, dy = 0) {
		const box = this.draw.viewbox();
		return this.xy((box.x -= dx), (box.y -= dy));
	}

	zoom(level?: number, point?: CoordinateXY) {
		// ? .zoom() method is somehow hidden
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
		if (!entity.visible) {
			entity.el?.remove();
			entity.el = null;
			return this;
		}
		let el = entity.el;
		if (!el) {
			el = draw.group().addClass("selectable");
			entity.el = el;
			el.node.onclick = (event) => {
				controls.onEntityClick.call(this, event, entity);
			};
			el.node.onpointerdown = (event) => {
				controls.onEntityPointerDown.call(this, event, entity);
			};
			el.node.onpointermove = (event) => {
				controls.onEntityPointerMove.call(this, event, entity);
			};
			el.node.onpointerup = (event) => {
				controls.onEntityPointerUp.call(this, event, entity);
			};
		}
		if (entity.needsTransform) {
			entity.transform(entity.el.transform());
			entity.el.transform({});
			entity.needsTransform = false;
		}
		let drawResult: Element[];
		if (entity instanceof CadArc) {
			const {center, radius, start_angle, end_angle, clockwise} = entity;
			drawResult = drawArc(el, center, radius, start_angle, end_angle, clockwise);
		} else if (entity instanceof CadCircle) {
			const {center, radius} = entity;
			drawResult = drawCircle(el, center, radius);
		} else if (entity instanceof CadDimension) {
			const {mingzi, qujian, font_size, axis} = entity;
			const points = this.data.getDimensionPoints(entity);
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
			drawResult = drawDimension(el, points, text, axis, font_size);
		} else if (entity instanceof CadHatch) {
			const {paths} = entity;
			drawResult = [];
			paths.forEach((path) => {
				const {edges, vertices} = path;
				let i = 0;
				edges.forEach(({start, end}) => {
					drawResult = drawResult.concat(drawLine(el, start, end, i++));
				});
				for (let j = 1; j < vertices.length; j++) {
					drawResult = drawResult.concat(drawLine(el, vertices[j - 1], vertices[j], i + j));
				}
			});
			if (!drawResult.length) {
				drawResult = null;
			}
		} else if (entity instanceof CadLine) {
			const {start, end} = entity;
			drawResult = drawLine(el, start, end);
		} else if (entity instanceof CadMtext) {
			const {text, insert, font_size, anchor} = entity;
			const parent = entity.parent;
			if (parent instanceof CadLine) {
				if (entity.info.isLengthText) {
					entity.text = Math.round(parent.length).toString();
					entity.font_size = this.config.lineTexts.lineLength;
					const offset = getVectorFromArray(parent.info.offset);
					entity.insert.copy(offset.add(parent.middle));
				}
				if (entity.info.isGongshiText) {
					entity.text = parent.gongshi;
					entity.font_size = this.config.lineTexts.gongshi;
					const offset = getVectorFromArray(parent.info.offset);
					entity.insert.copy(offset.add(parent.middle));
				}
			}
			drawResult = drawText(el, text, font_size, insert, anchor);
		}
		if (!drawResult) {
			entity.el?.remove();
			entity.el = null;
			return this;
		}
		el.attr({id: entity.id, type: entity.type});
		el.children().forEach((c) => {
			if (c.hasClass("fill")) {
				c.fill(color);
			}
			if (c.hasClass("stroke")) {
				c.stroke({width: linewidth, color});
				c.attr("vector-effect", "non-scaling-stroke");
			}
		});
		entity.children.forEach((c) => this.drawEntity(c, style));
		return this;
	}

	render(entities?: CadEntity | CadEntities | CadEntity[], style: CadStyle = {}) {
		if (!entities) {
			entities = this.data.getAllEntities();
		}
		if (entities instanceof CadEntity) {
			entities = [entities];
		}
		entities.forEach((e) => this.drawEntity(e, style));
		return this;
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

	selected() {
		return this.data.getAllEntities().filter((e) => e.selected, true);
	}

	unselected() {
		return this.data.getAllEntities().filter((e) => !e.selected, true);
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

	reset(data?: CadData) {
		this.draw.clear();
		if (data instanceof CadData) {
			this.data = data;
		}
		this.traverse((e) => {
			e.el = null;
			e.children.forEach((c) => (c.el = null));
		});
		return this.center().render();
	}

	// ? move entities efficiently
	moveEntities(toMove: CadEntities, notToMove: CadEntities, x: number, y: number) {
		const move = (es: CadEntities, x: number, y: number) => {
			es.forEach((e) => {
				e.el?.translate(x, y);
				e.needsTransform = true;
				if (e.children.length) {
					move(e.children, x, y);
				}
			});
		};
		if (toMove.length <= notToMove.length) {
			move(toMove, x, y);
		} else {
			this.move(x, y);
			move(notToMove, -x, -y);
		}
	}
}
