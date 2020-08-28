import {CadLayer} from "../cad-layer";
import {CadType, cadTypes} from "../cad-types";
import {MathUtils, Object3D} from "three";
import {index2RGB, RGB2Index} from "@app/utils";
import {CadTransformation} from "../cad-transformation";
import {lineweight2linewidth, linewidth2lineweight} from "../utils";
import {Shape} from "@svgdotjs/svg.js";
import Color from "color";

export abstract class CadEntity {
	id: string;
	originalId: string;
	type: CadType = null;
	layer: string;
	color: Color;
	linewidth: number;
	visible: boolean;
	opacity: number;
	selectable: boolean;
	object?: Object3D = null;
	shape?: Shape = null;
	info: {[key: string]: any};
	_indexColor: number;
	_lineweight: number;
	parent: CadEntity = null;
	children: CadEntity[] = [];

	get selected() {
		return this.shape?.hasClass("selected") === true;
	}
	set selected(value) {
		if (value === true) {
			this.shape?.addClass("selected");
		} else {
			this.shape?.removeClass("selected");
		}
	}

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		if (typeof data !== "object") {
			throw new Error("Invalid data.");
		}
		if (cadTypes.includes(data.type)) {
			this.type = data.type;
		}
		if (typeof data.id === "string" && !resetId) {
			this.id = data.id;
		} else {
			this.id = MathUtils.generateUUID();
		}
		this.originalId = data.originalId ?? this.id;
		this.layer = data.layer ?? "0";
		this.color = new Color();
		if (typeof data.color === "number") {
			this._indexColor = data.color;
			if (data.color === 256) {
				const layer = layers.find((layer) => layer.name === this.layer);
				if (layer) {
					this.color = new Color(layer.color);
				}
			} else {
				this.color = new Color(index2RGB(data.color, "number"));
			}
		} else {
			if (data.color instanceof Color) {
				this.color = new Color(data.color);
			}
			this._indexColor = RGB2Index(this.color.hex());
		}
		this.linewidth = data.linewidth ?? 1;
		this._lineweight = -3;
		if (typeof data.lineweight === "number") {
			this._lineweight = data.lineweight;
			if (data.lineweight >= 0) {
				this.linewidth = lineweight2linewidth(data.lineweight);
			} else if (data.lineweight === -1) {
				const layer = layers.find((layer) => layer.name === this.layer);
				if (layer) {
					this.linewidth = layer.linewidth;
				}
			}
		}
		this.visible = data.visible ?? true;
		this.opacity = data.opacity ?? 1;
		this.selectable = data.selectable ?? true;
		this.selected = data.selected ?? false;
		if (typeof data.info === "object" && !Array.isArray(data.info)) {
			this.info = data.info;
		} else {
			this.info = {};
		}
		// if (Array.isArray(data.children)) {
		// 	data.children.forEach((c) => this.children.push());
		// }
	}

	transform(trans: CadTransformation, _parent?: CadEntity) {
		this.children.forEach((e) => e.transform(trans, this));
		return this;
	}

	export() {
		this._indexColor = RGB2Index(this.color.hex());
		return {
			id: this.id,
			originalId: this.originalId,
			layer: this.layer,
			type: this.type,
			color: this._indexColor,
			lineweight: linewidth2lineweight(this.linewidth),
			children: this.children.map((c) => c.export()),
			info: this.info
		};
	}

	add(...children: CadEntity[]) {
		this.remove(...children);
		children.forEach((e) => {
			if (e instanceof CadEntity) {
				e.parent = this;
				this.children.push(e);
			}
		});
		return this;
	}

	remove(...children: CadEntity[]) {
		children.forEach((e) => {
			if (e instanceof CadEntity) {
				const index = this.children.findIndex((ee) => ee.id === e.id);
				if (index > -1) {
					e.parent = null;
					this.children.splice(index, 1);
				}
			}
		});
		return this;
	}

	abstract clone(resetId?: boolean): CadEntity;

	abstract equals(entity: CadEntity): boolean;

	// abstract getBounds(): Rectangle;
}
