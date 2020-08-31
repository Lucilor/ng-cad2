import {Angle, Arc, Point} from "@src/app/utils";
import {Matrix, MatrixAlias} from "@svgdotjs/svg.js";
import {CadLayer} from "../cad-layer";
import {getVectorFromArray} from "../utils";
import {CadEntity} from "./cad-entity";

export class CadArc extends CadEntity {
	center: Point;
	radius: number;
	start_angle: number;
	end_angle: number;
	clockwise: boolean;
	gongshi = "";

	get start() {
		return this.curve.getPoint(0);
	}
	get end() {
		return this.curve.getPoint(1);
	}
	get middle() {
		return this.curve.getPoint(0.5);
	}
	get curve() {
		const {center, radius, start_angle, end_angle, clockwise} = this;
		return new Arc(center, radius, new Angle(start_angle, "deg"), new Angle(end_angle, "deg"), clockwise);
	}
	get length() {
		return this.curve.length;
	}

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "ARC";
		this.center = getVectorFromArray(data.center);
		this.radius = data.radius ?? 0;
		this.start_angle = data.start_angle ?? 0;
		this.end_angle = data.end_angle ?? 0;
		this.clockwise = data.clockwise ?? false;
	}

	transform(matrix: MatrixAlias) {
		super.transform(matrix);
		this.curve.transform(new Matrix(matrix));
		return this;
	}

	export() {
		return {
			...super.export(),
			center: this.center.toArray(),
			radius: this.radius,
			start_angle: this.start_angle,
			end_angle: this.end_angle,
			clockwise: this.clockwise
		};
	}

	clone(resetId = false) {
		return new CadArc(this, [], resetId);
	}

	equals(entity: CadArc) {
		return this.curve.equals(entity.curve);
	}
}
