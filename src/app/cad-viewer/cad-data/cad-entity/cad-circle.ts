import {CadEntity} from "./cad-entity";
import {Vector2, ArcCurve} from "three";
import {CadLayer} from "../cad-layer";
import {getVectorFromArray} from "../utils";
import {CadTransformation} from "../cad-transformation";
import {Line2} from "three/examples/jsm/lines/Line2";

export class CadCircle extends CadEntity {
	object?: Line2;
	center: Vector2;
	radius: number;

	get curve() {
		const {center, radius} = this;
		return new ArcCurve(center.x, center.y, radius, 0, Math.PI * 2, true);
	}
	get length() {
		return this.curve.getLength();
	}

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "CIRCLE";
		this.center = getVectorFromArray(data.center);
		this.radius = data.radius ?? 0;
	}

	transform(trans: CadTransformation) {
		super.transform(trans);
		this.center.applyMatrix3(trans.matrix);
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

	// getBounds() {
	// 	const min = this.center.subScalar(this.radius);
	// 	const max = this.center.addScalar(this.radius);
	// 	return new Rectangle(new Point(min.x, min.y), new Point(max.x, max.y));
	// }
}
