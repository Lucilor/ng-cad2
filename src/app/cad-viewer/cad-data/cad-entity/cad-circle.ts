import {CadEntity} from "./cad-entity";
import {CadLayer} from "../cad-layer";
import {getVectorFromArray} from "../utils";
import {Line2} from "three/examples/jsm/lines/Line2";
import {Angle, Arc, Point} from "@src/app/utils";
import {Matrix, MatrixAlias} from "@svgdotjs/svg.js";

export class CadCircle extends CadEntity {
	object?: Line2;
	center: Point;
	radius: number;

	get curve() {
		const {center, radius} = this;
		return new Arc(center, radius, new Angle(0, "deg"), new Angle(360, "deg"), true);
	}
	get length() {
		return this.curve.length;
	}

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "CIRCLE";
		this.center = getVectorFromArray(data.center);
		this.radius = data.radius ?? 0;
	}

	transform(matrix: MatrixAlias) {
		super.transform(matrix);
		this.center.transform(new Matrix(matrix));
		return this;
	}

	export() {
		return {
			...super.export(),
			center: this.center.toArray(),
			radius: this.radius
		};
	}

	clone(resetId = false) {
		return new CadCircle(this, [], resetId);
	}

	equals(entity: CadCircle) {
		return this.radius === entity.radius && this.center.equals(entity.center);
	}

	// getBoundingRect() {
	// 	const min = this.center.subScalar(this.radius);
	// 	const max = this.center.addScalar(this.radius);
	// 	return new Rectangle(new Point(min.x, min.y), new Point(max.x, max.y));
	// }
}
