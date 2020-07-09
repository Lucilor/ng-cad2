import {Point} from "./point";
import {Line} from "./line";

export class Rectangle {
	position: Point;
	width: number;
	height: number;

	constructor(position: Point, width: number, height: number) {
		this.position = position;
		this.width = width;
		this.height = height;
	}

	containsPoint(point: Point) {
		const {x, y} = point;
		const {top, right, bottom, left} = this;
		return x >= left && x <= right && y <= top && y >= bottom;
	}

	containsLine(line: Line) {
		return this.containsPoint(line.start) && this.containsPoint(line.end);
	}

	get x() {
		return this.position.x;
	}

	get y() {
		return this.position.y;
	}

	get top() {
		return this.position.y;
	}

	get right() {
		return this.position.x + this.width;
	}

	get bottom() {
		return this.position.y - this.height;
	}

	get left() {
		return this.position.x;
	}

	equals(rect: Rectangle) {
		return this.position.equals(rect.position) && this.width === rect.width && this.height === rect.height;
	}

	intersects(rect: Rectangle) {
		let x = 0;
		let y = 0;
		let width = 0;
		let height = 0;
		if (this.left < rect.right && this.left > rect.left) {
			x = this.left;
			width = rect.right - this.left;
		}
		if (this.right > rect.left && this.right < rect.right) {
			x = rect.left;
			width = this.right - rect.left;
		}
		if (this.top > rect.bottom && this.top < rect.top) {
			y = rect.bottom;
			height = this.top - rect.bottom;
		}
		if (this.bottom < rect.top && this.bottom > rect.bottom) {
			y = this.bottom;
			height = rect.top - this.bottom;
		}
		if (width > 0 && height > 0) {
			return new Rectangle(new Point(x, y), width, height);
		}
		return null;
	}
}
