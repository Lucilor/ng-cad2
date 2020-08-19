import {CadEntity} from "./cad-entity";
import {CadLayer} from "../cad-layer";
import {intersection} from "lodash";
import {Line2} from "three/examples/jsm/lines/Line2";
import {CadTransformation} from "../cad-transformation";

export interface CadDimensionEntity {
	id: string;
	location: "start" | "end" | "center" | "min" | "max";
}

export class CadDimension extends CadEntity {
	font_size: number;
	dimstyle: string;
	axis: "x" | "y";
	entity1: CadDimensionEntity;
	entity2: CadDimensionEntity;
	distance: number;
	distance2?: number;
	cad1: string;
	cad2: string;
	mingzi: string;
	qujian: string;
	ref: "entity1" | "entity2" | "minX" | "maxX" | "minY" | "maxY" | "minLength" | "maxLength";
	object?: Line2;

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "DIMENSION";
		this.font_size = data.font_size || 16;
		if (this.font_size === 2.5) {
			this.font_size = 36;
		}
		this.dimstyle = data.dimstyle || "";
		["entity1", "entity2"].forEach((field: "entity1" | "entity2") => {
			this[field] = {id: "", location: "center"};
			if (data[field]) {
				if (typeof data[field].id === "string") {
					this[field].id = data[field].id;
				}
				this[field].location = data[field].location ?? "center";
			}
		});
		this.axis = data.axis ?? "x";
		this.distance = data.distance ?? 20;
		this.cad1 = data.cad1 ?? "";
		this.cad2 = data.cad2 ?? "";
		this.mingzi = data.mingzi ?? "";
		this.qujian = data.qujian ?? "";
		this.ref = data.ref;
		if (!this.ref) {
			if (this.axis === "x") {
				this.ref = "maxY";
			} else if (this.axis === "y") {
				this.ref = "maxX";
			}
		}
	}

	transform(trans: CadTransformation) {
		super.transform(trans);
		return this;
	}

	export() {
		return {
			...super.export(),
			dimstyle: this.dimstyle,
			font_size: this.font_size,
			axis: this.axis,
			entity1: {...this.entity1},
			entity2: {...this.entity2},
			distance: this.distance,
			cad1: this.cad1,
			cad2: this.cad2,
			mingzi: this.mingzi,
			qujian: this.qujian,
			ref: this.ref
		};
	}

	clone(resetId = false) {
		return new CadDimension(this, [], resetId);
	}

	equals(dimension: CadDimension) {
		const aIds = [this.entity1.id, this.entity2.id];
		const bIds = [dimension.entity1.id, dimension.entity2.id];
		return intersection(aIds, bIds).length === 2 || this.id === dimension.id || this.originalId === dimension.originalId;
	}
}
