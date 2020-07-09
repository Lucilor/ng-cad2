import {Point} from "./point";
import {Angle} from "./angle";
import {Line} from "./line";

export class Arc {
	center: Point;
	radius: number;
	clockwise: boolean;
	private _startAngle: Angle;
	private _endAngle: Angle;
	private _startPoint: Point;
	private _endPoint: Point;

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

	get startAngle() {
		return this._startAngle;
	}

	set startAngle(angle: Angle) {
		this._startAngle = angle;
		const d = new Point(Math.cos(this._startAngle.rad), Math.sin(this._startAngle.rad)).multiply(this.radius);
		this._startPoint = this.center.clone().add(d);
	}

	get endAngle() {
		return this._endAngle;
	}

	set endAngle(angle: Angle) {
		this._endAngle = angle;
		const d = new Point(Math.cos(this._endAngle.rad), Math.sin(this._endAngle.rad)).multiply(this.radius);
		this._endPoint = this.center.clone().add(d);
	}

	get startPoint() {
		return this._startPoint;
	}

	set startPoint(value: Point) {
		this._startPoint = value;
		this._startAngle.set(new Line(this.center, this._startPoint).theta, "rad");
	}

	get endPoint() {
		return this._endPoint;
	}

	set endPoint(value: Point) {
		this._endPoint = value;
		this._endAngle.set(new Line(this.center, this._endPoint).theta, "rad");
	}

	get length() {
		const {radius, _startAngle: startAngle, _endAngle: endAngle} = this;
		return radius * Math.abs(startAngle.rad - endAngle.rad);
	}

	get middle() {
		const angle = (this._startAngle.rad + this._endAngle.rad) / 2;
		const d = new Point(Math.cos(angle), Math.sin(angle)).multiply(this.radius);
		return this.center.clone().add(d);
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
}
