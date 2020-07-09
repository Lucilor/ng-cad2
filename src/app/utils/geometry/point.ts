export class Point {
	x: number;
	y: number;
	constructor(x = 0, y = 0) {
		this.set(x, y);
	}

	set(x = 0, y = 0) {
		this.x = x;
		this.y = y;
		return this;
	}

	equals(p: Point) {
		return p.x === this.x && p.y === this.y;
	}

	closeTo(p: Point, tolerance: number) {
		return this.distance(p) <= tolerance;
	}

	add(p: Point): Point {
		this.x += p.x;
		this.y += p.y;
		return this;
	}

	addScalar(value: number) {
		this.x += value;
		this.y += value;
		return this;
	}

	sub(p: Point): Point {
		this.x -= p.x;
		this.y -= p.y;
		return this;
	}

	subScalar(value: number) {
		this.x -= value;
		this.y -= value;
		return this;
	}

	multiply(p: Point): Point {
		this.x *= p.x;
		this.y *= p.y;
		return this;
	}

	multiplyScalar(value: number) {
		this.x *= value;
		this.y *= value;
		return this;
	}

	divide(p: Point): Point {
		this.x /= p.x;
		this.y /= p.y;
		return this;
	}

	divideScalar(value: number) {
		this.x /= value;
		this.y /= value;
		return this;
	}

	clone() {
		return new Point(this.x, this.y);
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
		const d = new Point(Math.cos(theta), Math.sin(theta)).multiplyScalar(length);
		return this.set(anchor.x + d.x, anchor.y + d.y);
	}

	toArray() {
		return [this.x, this.y];
	}

	distance(to: Point) {
		const {x, y} = this;
		if (to instanceof Point) {
			return Math.sqrt((x - to.x) ** 2 + (y - to.y) ** 2);
		}
	}
}
