import {
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	Vector2,
	MathUtils,
	Raycaster,
	Color,
	ShapeGeometry,
	Mesh,
	MeshBasicMaterial,
	Material,
	Vector3,
	AmbientLight
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import {CadViewerControls, CadViewerControlsConfig} from "./cad-viewer-controls";
import TextSprite from "@seregpie/three.text-sprite";
import {CadEntity} from "./cad-data/cad-entity/cad-entity";
import {CadMtext} from "./cad-data/cad-entity/cad-mtext";
import {CadDimension} from "./cad-data/cad-entity/cad-dimension";
import {CadData} from "./cad-data/cad-data";
import {CadEntities} from "./cad-data/cad-entities";
import {CadLine} from "./cad-data/cad-entity/cad-line";
import {CadCircle} from "./cad-data/cad-entity/cad-circle";
import {CadArc} from "./cad-data/cad-entity/cad-arc";
import {CadHatch} from "./cad-data/cad-entity/cad-hatch";
import {CadStyle, CadStylizer} from "./cad-stylizer";
import {CadTypes} from "./cad-data/cad-types";
import {Line2} from "three/examples/jsm/lines/Line2";
import {LineGeometry} from "three/examples/jsm/lines/LineGeometry";
import {LineMaterial} from "three/examples/jsm/lines/LineMaterial";
import {SVG, Svg, Shape, Dom} from "@svgdotjs/svg.js";

export interface CadViewerConfig {
	width?: number;
	height?: number;
	backgroundColor?: number;
	backgroundAlpha?: number;
	selectedColor?: number;
	hoverColor?: number;
	showLineLength?: number;
	showGongshi?: number;
	padding?: number[] | number;
	fps?: number;
	showStats?: boolean;
	reverseSimilarColor?: boolean;
	validateLines?: boolean;
	antialias?: boolean;
	dashSize?: number;
	gapSize?: number;
}

export class CadViewer {
	data: CadData;
	config: CadViewerConfig = {
		width: 300,
		height: 150,
		backgroundColor: 0,
		backgroundAlpha: 1,
		selectedColor: 0xffff00,
		hoverColor: 0x00ffff,
		showLineLength: 0,
		showGongshi: 0,
		padding: [0],
		fps: 60,
		showStats: false,
		reverseSimilarColor: true,
		validateLines: false,
		antialias: true,
		dashSize: 1,
		gapSize: 1
	};
	svg: Svg;
	stylizer: CadStylizer;

	get dom() {
		return this.svg.node;
	}
	get width() {
		return this.svg.width;
	}
	get height() {
		return this.svg.height;
	}

	private _destroyed = false;

	constructor(data: CadData, addTo: string | Dom | HTMLElement, config: CadViewerConfig = {}) {
		this.data = data;
		Object.assign(this.config, config);

		this.svg = SVG().addTo(addTo);
		this.setBackground(this.config);
		this.stylizer = new CadStylizer(this);
		this.render(true);
	}

	setBackground({width, height, color}: {width?: number; height?: number; color?: number}) {
		if (typeof width !== "number") {
			width = this.config.width;
		}
		if (typeof height !== "number") {
			height = this.config.height;
		}
		if (typeof color !== "number") {
			color = this.config.backgroundColor;
		}
		this.svg.size(width, height);
		const colorStyle = new Color(color).getStyle();
		this.svg.css("background-color", colorStyle);
		this.svg.css("transform-origin", "center");
	}

	render(center = false, entities?: CadEntities, style: CadStyle = {}) {
		const {svg, data, stylizer} = this;
		if (!entities) {
			entities = data.getAllEntities();
		}
		let el: Shape;
		entities.forEach((e) => {
			if (e instanceof CadLine) {
				el = svg.line([e.start.x, -e.start.y, e.end.x, -e.end.y]);
			} else if (e instanceof CadCircle) {
				const {center, radius} = e;
				if (e instanceof CadArc) {
					const {curve, start_angle, end_angle, clockwise} = e;
					const {x: x0, y: y0} = curve.getPoint(0);
					const {x: x1, y: y1} = curve.getPoint(1);
					const l0 = Math.PI * 2 * radius;
					const isLargeArc = curve.getLength() / l0 > 0.5 ? 1 : 0;
					el = svg.path([
						["M", x0, -y0],
						["A", radius, radius, end_angle - start_angle, isLargeArc, clockwise ? 1 : 0, x1, -y1]
					]);
				} else {
					el = svg.circle(radius);
					el.move(center.x - radius / 2, -center.y - radius / 2);
				}
			} else if (e instanceof CadMtext) {
				const {text, insert, anchor, font_size} = e;
				el = svg.text(text);
				el.move(insert.x, -insert.y);
				el.css("font-size", font_size + "px");
			}
			style = stylizer.get(e, style);
			const color = style.color.getStyle();
			el?.attr({stroke: color, fill: color, "stroke-width": 1, "vector-effect": "non-scaling-stroke"});
		});
		if (center === true) {
			this.center();
		}
	}

	center() {
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
		const {x, y, width, height} = this.data.getBounds();
		this.svg.viewbox(
			x - width / 2 - padding[3],
			-y - height / 2 - padding[0],
			width + padding[1] + padding[3],
			height + padding[0] + padding[2]
		);
		this.svg.css("transform", "scale(1)");
	}
}
