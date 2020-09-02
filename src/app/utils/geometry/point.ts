import {Matrix, Point as P} from "@svgdotjs/svg.js";
import {Line} from "..";
import {DEFAULT_TOLERANCE} from "./constants";

export class Point {
	x: number;
	y: number;

	constructor(x?: number, y?: number);
	constructor(xy: number[] | {x: number; y: number});
	constructor(x: number | number[] | {x: number; y: number} = 0, y?: number) {
		if (Array.isArray(x)) {
			this.x = x[0];
			this.y = x[1];
		} else if (typeof x === "number") {
			this.x = x;
			this.y = typeof y === "number" ? y : x;
		} else if (typeof x?.x === "number" && typeof x?.y === "number") {
			this.x = x.x;
			this.y = x.y;
		}
	}

	set(x?: number, y?: number): Point;
	set(point: Point): Point;
	set(x: number | Point = 0, y = x) {
		if (typeof x === "number") {
			this.x = x;
			this.y = y as number;
		} else {
			this.x = x.x;
			this.y = x.y;
		}
		return this;
	}

	equals(point: Point, tolerance = DEFAULT_TOLERANCE) {
		const {x, y} = point;
		return Math.abs(x - this.x) <= tolerance && Math.abs(y - this.y) <= tolerance;
	}

	add(point?: Point): Point;
	add(x?: number, y?: number): Point;
	add(x?: Point | number, y?: number): Point {
		if (x instanceof Point) {
			this.x += x.x;
			this.y += x.y;
			return this;
		}
		return this.add(new Point(x, y));
	}

	sub(point?: Point): Point;
	sub(x?: number, y?: number): Point;
	sub(x?: Point | number, y?: number): Point {
		if (x instanceof Point) {
			this.x -= x.x;
			this.y -= x.y;
			return this;
		}
		return this.sub(new Point(x, y));
	}

	multiply(point?: Point): Point;
	multiply(x?: number, y?: number): Point;
	multiply(x?: Point | number, y?: number): Point {
		if (x instanceof Point) {
			this.x *= x.x;
			this.y *= x.y;
			return this;
		}
		return this.multiply(new Point(x, y));
	}

	divide(point?: Point): Point;
	divide(x?: number, y?: number): Point;
	divide(x?: Point | number, y?: number): Point {
		if (x instanceof Point) {
			this.x /= x.x;
			this.y /= x.y;
			return this;
		}
		return this.divide(new Point(x, y));
	}

	clone() {
		return new Point(this.x, this.y);
	}

	copy({x, y}: Point) {
		return this.set(x, y);
	}

	flip(vertical = false, horizontal = false, anchor = new Point(0)) {
		const dx = anchor.x - this.x;
		const dy = anchor.y - this.y;
		if (vertical === true) {
			this.y += dy * 2;
		}
		if (horizontal === true) {
			this.x += dx * 2;
		}
		return this;
	}

	rotate(angle: number, anchor = new Point(0)) {
		const {x: x1, y: y1} = anchor;
		const {x: x2, y: y2} = this;
		const theta = Math.atan2(y2 - y1, x2 - x1) + angle;
		const length = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
		const d = new Point(Math.cos(theta), Math.sin(theta)).multiply(length);
		return this.set(anchor.x + d.x, anchor.y + d.y);
	}

	toArray(): [number, number] {
		return [this.x, this.y];
	}

	distanceTo(point: Point | Line) {
		const {x, y} = this;
		if (point instanceof Point) {
			return Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
		} else {
			return point.distanceTo(this);
		}
	}

	crossProduct(point: Point) {
		return this.x * point.y - this.y * point.x;
	}

	transform(matrix: Matrix) {
		const p = new P(this.x, this.y).transform(matrix);
		return this.set(p.x, p.y);
	}
}
