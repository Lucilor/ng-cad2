import {Point} from "./point";
import {Angle} from "./angle";
import {Line} from "./line";
import {MatrixExtract, MatrixTransformParam} from "@svgdotjs/svg.js";

export class Arc {
	center: Point;
	radius: number;
	clockwise: boolean;
	startAngle: Angle;
	endAngle: Angle;

	constructor(center = new Point(), radius?: number, start?: Angle | Point, end?: Angle | Point, clockwise = true) {
	    this.center = center;
	    this.radius = radius || 0;
	    this.clockwise = clockwise;
	    if (start instanceof Angle) {
	        this.startAngle = start;
	    } else if (start instanceof Point) {
	        this.startAngle = new Angle();
	        this.startPoint = start;
	    } else {
	        this.startAngle = new Angle(0);
	    }
	    if (end instanceof Angle) {
	        this.endAngle = end;
	    } else if (end instanceof Point) {
	        this.endAngle = new Angle();
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
	get totalAngle() {
	    const {startAngle, endAngle, clockwise} = this;
	    let start = startAngle.rad;
	    let end = endAngle.rad;
	    if (clockwise) {
	        while (end > start) {
	            end -= Math.PI * 2;
	        }
	        return new Angle(start - end, "rad");
	    } else {
	        while (start > end) {
	            start -= Math.PI * 2;
	        }
	        return new Angle(end - start, "rad");
	    }
	}
	get length() {
	    return this.radius * this.totalAngle.rad;
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

	equals(arc: Arc) {
	    return (
	        this.center.equals(arc.center) &&
			this.radius === arc.radius &&
			this.startAngle.equals(arc.startAngle) &&
			this.endAngle.equals(arc.endAngle) &&
			this.clockwise === arc.clockwise
	    );
	}

	getPoint(t: number) {
	    const {startAngle, totalAngle, clockwise, radius} = this;
	    const angle = startAngle.rad + totalAngle.rad * t * (clockwise ? -1 : 1);
	    const offset = new Point(Math.cos(angle), Math.sin(angle)).multiply(radius);
	    return this.center.clone().add(offset);
	}

	transform(matrix: MatrixExtract | MatrixTransformParam) {
	    const start = this.getPoint(0).transform(matrix);
	    const end = this.getPoint(1).transform(matrix);
	    this.center.transform(matrix);
	    this.startPoint = start;
	    this.endPoint = end;
	    this.radius = this.center.distanceTo(start);
	}
}
