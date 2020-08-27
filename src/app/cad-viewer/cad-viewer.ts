import {SVG, Svg, Color, CoordinateXY} from "@svgdotjs/svg.js";
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

export interface CadViewerConfig {
	width?: number;
	height?: number;
	backgroundColor?: Color;
	selectedColor?: number;
	hoverColor?: number;
	showLineLength?: number;
	showGongshi?: number;
	padding?: number[] | number;
	showStats?: boolean;
	reverseSimilarColor?: boolean;
	validateLines?: boolean;
}

export class CadViewer extends EventEmitter {
	data: CadData;
	config: CadViewerConfig = {
		width: 300,
		height: 150,
		backgroundColor: new Color(),
		selectedColor: 0xffff00,
		hoverColor: 0x00ffff,
		showLineLength: 0,
		showGongshi: 0,
		padding: [0],
		showStats: false,
		reverseSimilarColor: true,
		validateLines: false
	};
	dom: HTMLDivElement;
	draw: Svg;
	stylizer: CadStylizer;

	private _status: {pointer: Point; button: number} = {pointer: null, button: -1};

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

		const node = this.draw.node;
		node.addEventListener("wheel", this._onWheel.bind(this));
		node.addEventListener("click", this._onClick.bind(this));
		node.addEventListener("pointerdown", this._onPointerDown.bind(this));
		node.addEventListener("pointermove", this._onPointerMove.bind(this));
		node.addEventListener("pointerup", this._onPointerUp.bind(this));
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
		} else if (entity instanceof CadCircle) {
			const {center, radius} = entity;
			if (!entity.shape) {
				entity.shape = draw.circle();
			}
			entity.shape.center(center.x, center.y);
			entity.shape.radius(radius);
		} else if (entity instanceof CadDimension) {
		} else if (entity instanceof CadHatch) {
		} else if (entity instanceof CadLine) {
			const {start, end} = entity;
			if (!entity.shape) {
				entity.shape = draw.line();
			}
			entity.shape.plot(start.x, start.y, end.x, end.y);
		} else if (entity instanceof CadMtext) {
		}
		const shape = entity.shape;
		if (shape) {
			shape.attr({id: entity.id, "vector-effect": "non-scaling-stroke"});
			shape.stroke({width: linewidth, color: color.string()});
			shape.fill("none");
			shape.on("click", () => {
				if (shape.hasClass("selected")) {
					shape.removeClass("selected");
				} else {
					shape.addClass("selected");
				}
			});
		}
	}

	render(center = false, entities?: CadEntities, style: CadStyle = {}) {
		const {draw} = this;
		if (!entities) {
			entities = this.data.getAllEntities();
		}
		if (center) {
			this.center();
		}
		entities.forEach((e) => this.drawEntity(e));
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
		this.resize().render();
	}

	// * Normalized Device Coordinate
	private _getNDC(x: number, y: number) {
		const {width, height, top, left} = this.draw.node.getBoundingClientRect();
		const ndcX = ((x - left) / width) * 2 - 1;
		const ndcY = (-(y - top) / height) * 2 + 1;
		// const ndcY = ((y - top) / height) * 2 - 1;
		return new Point(ndcX, ndcY);
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

	// * events start
	private _onWheel(event: WheelEvent) {
		const step = 0.1;
		const {deltaY, clientX, clientY} = event;
		const {x, y} = this.getPointInView(clientX, clientY);
		const zoom = this.zoom();
		if (deltaY > 0) {
			this.zoom(zoom * (1 - step), [x, y]);
		} else if (deltaY < 0) {
			this.zoom(zoom * (1 + step), [x, y]);
		}
	}

	private _onClick(event: PointerEvent) {
		// const {clientX, clientY} = event;
		// console.log(clientY, screenY);
		// console.log(this.getPointInView(clientX, clientY));
	}

	private _onPointerDown({clientX, clientY, button}: PointerEvent) {
		this._status.pointer = new Point(clientX, clientY);
		this._status.button = button;
	}

	private _onPointerMove({clientX, clientY, shiftKey}: PointerEvent) {
		const {_status} = this;
		const {pointer, button} = _status;
		if ((button === 0 && shiftKey) || button === 1) {
			if (_status.pointer) {
				const offset = new Point(clientX, clientY).sub(pointer).divide(this.zoom());
				this.move(offset.x, offset.y);
				pointer.set(clientX, clientY);
			}
		}
	}

	private _onPointerUp() {
		this._status.pointer = null;
		this._status.button = -1;
	}
	// * events end
}
