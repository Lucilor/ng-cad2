import {ArcCurve, MathUtils, Vector2} from "three";
import {CadLayer} from "../cad-layer";
import {CadTransformation} from "../cad-transformation";
import {clampAngle} from "../utils";
import {CadEntity} from "./cad-entity";

export class CadArc extends CadEntity {
	center: Vector2;
	radius: number;
	start_angle: number;
	end_angle: number;
	clockwise: boolean;
	get start() {
		return this.curve.getPoint(0);
	}
	get end() {
		return this.curve.getPoint(1);
	}
	get curve() {
		const {center, radius, start_angle, end_angle, clockwise} = this;
		return new ArcCurve(center.x, center.y, radius, MathUtils.degToRad(start_angle), MathUtils.degToRad(end_angle), clockwise);
	}
	get length() {
		return this.curve.getLength();
	}

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "ARC";
		this.start_angle = data.start_angle ?? 0;
		this.end_angle = data.end_angle ?? 0;
		this.clockwise = data.clockwise ?? false;
	}

	transform(trans: CadTransformation) {
		super.transform(trans);
		const {center, curve} = this;
		const {matrix, flip} = trans;
		center.applyMatrix3(matrix);
		const start = curve.getPoint(0).applyMatrix3(matrix);
		const end = curve.getPoint(1).applyMatrix3(matrix);
		const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
		const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
		this.start_angle = MathUtils.radToDeg(startAngle);
		this.end_angle = MathUtils.radToDeg(endAngle);
		if (flip.vertical !== flip.horizontal) {
			this.clockwise = !this.clockwise;
		}
		return this;
	}

	export() {
		return {
			...super.export(),
			start_angle: this.start_angle,
			end_angle: this.end_angle,
			clockwise: this.clockwise
		};
	}

	clone(resetId = false) {
		return new CadArc(this, [], resetId);
	}

	equals(entity: CadArc) {
		const startAngle1 = clampAngle(this.start_angle);
		const endAngle1 = clampAngle(this.end_angle);
		const startAngle2 = clampAngle(entity.start_angle);
		const endAngle2 = clampAngle(entity.end_angle);
		return (
			this.radius === entity.radius &&
			this.center.equals(entity.center) &&
			startAngle1 === startAngle2 &&
			endAngle1 === endAngle2 &&
			this.clockwise === entity.clockwise
		);
	}
}
