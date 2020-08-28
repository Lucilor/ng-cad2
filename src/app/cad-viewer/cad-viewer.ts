import {SVG, Svg, CoordinateXY, Tspan, List} from "@svgdotjs/svg.js";
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

export interface CadViewerConfig {
	width?: number;
	height?: number;
	backgroundColor?: Color;
	showLineLength?: number;
	showGongshi?: number;
	padding?: number[] | number;
	showStats?: boolean;
	reverseSimilarColor?: boolean;
	validateLines?: boolean;
	selectMode?: "none" | "single" | "multiple";
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
		selectMode: "multiple"
	};
	dom: HTMLDivElement;
	draw: Svg;
	stylizer: CadStylizer;
	status: {pointer: {from: Point; to: Point}; button: number; multiSelector: HTMLDivElement} = {
		pointer: null,
		button: -1,
		multiSelector: null
	};

	constructor(data: CadData, config: CadViewerConfig = {}) {
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
		dom.addEventListener("keydown", controls.onKeyboard.bind(this));
		dom.tabIndex = 0;
		dom.focus();
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

	dx(value = 0) {
		return this.x(this.x() - value);
	}

	dy(value = 0) {
		return this.y(this.y() + value);
	}

	move(dx = 0, dy = 0) {
		const box = this.draw.viewbox();
		box.x -= dx;
		box.y += dy;
		this.draw.viewbox(box);
		return this;
	}

	moveTo(x = 0, y = 0) {
		const box = this.draw.viewbox();
		box.x = x;
		box.y = y;
		this.draw.viewbox(box);
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
		draw.attr("width", width);
		draw.attr("height", height);

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
		let type: "fill" | "stroke";
		if (entity instanceof CadArc) {
			const {curve, radius, start_angle, end_angle, clockwise} = entity;
			const {x: x0, y: y0} = curve.getPoint(0);
			const {x: x1, y: y1} = curve.getPoint(1);
			const l0 = Math.PI * 2 * radius;
			const isLargeArc = curve.getLength() / l0 > 0.5 ? 1 : 0;
			if (!entity.shape) {
				entity.shape = draw.path();
			}
			entity.shape.plot([
				["M", x0, y0],
				["A", radius, radius, end_angle - start_angle, isLargeArc, clockwise ? 0 : 1, x1, y1]
			]);
			type = "stroke";
		} else if (entity instanceof CadCircle) {
			const {center, radius} = entity;
			if (!entity.shape) {
				entity.shape = draw.circle();
			}
			entity.shape.center(center.x, center.y);
			entity.shape.radius(radius);
			type = "stroke";
		} else if (entity instanceof CadDimension) {
		} else if (entity instanceof CadHatch) {
		} else if (entity instanceof CadLine) {
			const {start, end} = entity;
			if (!entity.shape) {
				entity.shape = draw.line();
			}
			entity.shape.plot(start.x, start.y, end.x, end.y);
			type = "stroke";
		} else if (entity instanceof CadMtext) {
			const {text, insert, font_size, anchor} = entity;
			if (!entity.shape) {
				entity.shape = draw.text("");
			}
			entity.shape.font({size: font_size}).text(text).leading(1);
			entity.shape.move(insert.x, insert.y);
			type = "fill";
			setTimeout(() => {
				const tspans = entity.shape.children() as List<Tspan>;
				const width = Math.max(...tspans.map((v) => v.length()));
				const height = (tspans.length + 1 / 3) * font_size;
				const dx = -width * anchor.x;
				const dy = height * anchor.y;
				entity.shape.transform({a: 1, b: 0, c: 0, d: -1, e: dx, f: dy + insert.y * 2});
				tspans.slice(1).forEach((tspan) => tspan.dy("1em"));
			}, 0);
		}
		const shape = entity.shape;
		if (shape) {
			shape.attr({id: entity.id, "vector-effect": "non-scaling-stroke"});
			if (type === "fill") {
				shape.fill({color: color.string()});
				shape.addClass("fill");
			} else if (type === "stroke") {
				shape.stroke({width: linewidth, color: color.string()});
				shape.addClass("stroke");
			}
			shape.on("click", (event) => {
				controls.onEntityClick.call(this, event, entity);
			});
		}
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
		const rect = this.data.getBounds();
		const outerWidth = this.width();
		const outerHeight = this.height();
		const padding = cloneDeep(this.config.padding) as number[];
		const scaleX = (outerWidth - padding[1] - padding[3]) / rect.width;
		const scaleY = (outerHeight - padding[0] - padding[2]) / rect.height;
		const scale = Math.min(scaleX, scaleY);
		for (let i = 0; i < padding.length; i++) {
			padding[i] /= scale;
		}
		let width = rect.width + padding[1] + padding[3];
		let height = rect.height + padding[0] + padding[2];
		const ratio = outerWidth / outerHeight;
		if (ratio > width / height) {
			width = height * ratio;
			rect.width = width - padding[1] - padding[3];
		} else {
			height = width / ratio;
			rect.height = height - padding[0] - padding[2];
		}
		const x = rect.x - rect.width / 2 - padding[3];
		const y = rect.y - rect.height / 2 - padding[2];
		this.draw.viewbox(x, y, width, height);
		this.draw.transform({a: 1, b: 0, c: 0, d: -1, e: 0, f: 0});
		return this.resize();
	}

	addEntity(...entities: CadEntity[]) {
		this.data.entities.add(...entities);
		return this.render(false, entities);
	}

	removeEntity(...entities: CadEntity[]) {
		entities.forEach((e) => e.shape?.remove());
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
			e.shape?.remove();
			e.shape = null;
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

	getPointInView(x: number, y: number) {
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
}
