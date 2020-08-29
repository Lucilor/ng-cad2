import {Point} from "./point";
import {Angle} from "./angle";
import {Line} from "./line";

export class Arc {
	center: Point;
	radius: number;
	clockwise: boolean;
	startAngle: Angle;
	endAngle: Angle;

	constructor(center = new Point(), radius?: number, start?: Angle | Point, end?: Angle | Point, clockwise = true) {
		this.center = center;
		this.radius = radius;
		this.clockwise = clockwise;
		if (start instanceof Angle) {
			this.startAngle = start;
		} else if (start instanceof Point) {
			this.startPoint = start;
		} else {
			this.startAngle = new Angle(0);
		}
		if (end instanceof Angle) {
			this.endAngle = end;
		} else if (end instanceof Point) {
			this.endPoint = end;
		} else {
			this.endAngle = new Angle(Math.PI * 2);
		}
	}

	get startPoint() {
		const d = new Point(Math.cos(this.startAngle.rad), Math.sin(this.startAngle.rad)).multiply(this.radius);
		return this.center.clone().add(d);
	}

	set startPoint(value: Point) {
		this.startAngle = new Line(this.center, value).theta;
	}

	get endPoint() {
		const d = new Point(Math.cos(this.endAngle.rad), Math.sin(this.endAngle.rad)).multiply(this.radius);
		return this.center.clone().add(d);
	}

	set endPoint(value: Point) {
		this.endAngle = new Line(this.center, value).theta;
	}

	get length() {
		const {radius, startAngle, endAngle, clockwise} = this;
		let start = startAngle.rad;
		let end = endAngle.rad;
		if (clockwise) {
			while (end > start) {
				end -= Math.PI * 2;
			}
			return radius * (start - end);
		} else {
			while (start > end) {
				start -= Math.PI * 2;
			}
			return radius * (end - start);
		}
	}

	flip(vertical = false, horizontal = false, anchor = new Point()) {
		this.center.flip(vertical, horizontal, anchor);
		this.startPoint = this.startPoint.flip(vertical, horizontal, anchor);
		this.endPoint = this.endPoint.flip(vertical, horizontal, anchor);
		if (vertical !== horizontal) {
			this.clockwise = !this.clockwise;
		}
		return this;
	}

	rotate(angle: number, anchor = new Point(0)) {
		this.center.rotate(angle, anchor);
		this.startPoint = this.startPoint.rotate(angle, anchor);
		this.endPoint = this.endPoint.rotate(angle, anchor);
		return this;
	}

	// TODO: get point on arc
	// getPoint(t:number){

	// }
}
