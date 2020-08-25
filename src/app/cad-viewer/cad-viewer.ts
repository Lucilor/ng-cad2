import {SVG, Svg, Color, PointArrayAlias, Point, CoordinateXY} from "@svgdotjs/svg.js";
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

export class CadViewer {
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

	constructor(data: CadData, config: CadViewerConfig = {}) {
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

		this.resize().setBackgroundColor();
		this.render(true);

		this.dom.addEventListener("wheel", this._onWheel.bind(this));
		this.draw.node.addEventListener("click", this._onClick.bind(this));
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

	// position(value?: Point) {
	// 	const box = this.draw.viewbox();
	// 	if (value instanceof Point) {
	// 		box.x = value.x;
	// 		box.y = value.y;
	// 		this.draw.viewbox(box);
	// 	} else {
	// 		return box;
	// 	}
	// }

	zoom(level?: number, point?: CoordinateXY) {
		// ! zoom method is somehow hidden
		return (this.draw as any).zoom(level, point);
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

	private _drawEntity(entity: CadEntity) {
		const {draw} = this;
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
			shape.attr("id", entity.id);
			shape.stroke({width: 1 / this.zoom(), color: entity.color.getStyle()});
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
		entities.forEach((e) => this._drawEntity(e));
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
		const {width, height, top, left} = this.draw.node.getBoundingClientRect();
		// const ndc = this._getNDC(x, y);
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

	private _onClick(event: MouseEvent) {
		const {clientX, clientY} = event;
		console.log(clientY, screenY);
		console.log(this.getPointInView(clientX, clientY));
	}
	// * events end
}
