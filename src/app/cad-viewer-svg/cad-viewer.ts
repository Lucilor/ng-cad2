import {
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	Vector2,
	MathUtils,
	Raycaster,
	Color,
	ShapeGeometry,
	Shape,
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
import {SVG, Svg} from "@svgdotjs/svg.js";

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
	get dom() {
		return this.svg.dom;
	}

	private _destroyed = false;

	constructor(data: CadData, config: CadViewerConfig = {}) {
		this.data = data;
		Object.assign(this.config, config);

		this.svg = SVG();
		this.setBackground(this.config);
	}

	setBackground({width, height, color}: {width?: number; height?: number; color?: number}) {
		if (typeof width !== "number") {
			width = this.config.width;
		}
		if (typeof height !== "number") {
			height = this.config.height;
		}
		if (typeof width !== "number") {
			width = this.config.width;
		}
		this.svg.size(width, height);
		const colorStyle = new Color(color).getStyle();
		this.svg.css("background-color", colorStyle);
	}

	render(center = false, entities?: CadEntities, style: CadStyle = {}) {}
}
