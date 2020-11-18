import {Point} from "./point";
import {Line} from "./line";

export class Rectangle {
    min: Point;
    max: Point;

    get width() {
        return this.max.x - this.min.x;
    }
    get height() {
        return this.max.y - this.min.y;
    }
    get top() {
        return this.max.y;
    }
    set top(value) {
        this.max.y = value;
    }
    get right() {
        return this.max.x;
    }
    set right(value) {
        this.max.x = value;
    }
    get bottom() {
        return this.min.y;
    }
    set bottom(value) {
        this.min.y = value;
    }
    get left() {
        return this.min.x;
    }
    set left(value) {
        this.min.x = value;
    }
    get x() {
        return (this.min.x + this.max.x) / 2;
    }
    get y() {
        return (this.min.y + this.max.y) / 2;
    }

    constructor(min = new Point(), max = new Point()) {
        this.min = min;
        this.max = max;
    }

    justify() {
        if (this.min.x > this.max.x) {
            [this.min.x, this.max.x] = [this.max.x, this.min.x];
        }
        if (this.min.y > this.max.y) {
            [this.min.y, this.max.y] = [this.max.y, this.min.y];
        }
        return this;
    }

    clone() {
        return new Rectangle(this.min.clone(), this.max.clone());
    }

    copy(rect: Rectangle) {
        this.min.copy(rect.min);
        this.max.copy(rect.max);
    }

    expand(point: Point) {
        const {x, y} = point;
        this.min.x = Math.min(this.min.x, x);
        this.min.y = Math.min(this.min.y, y);
        this.max.x = Math.max(this.max.x, x);
        this.max.y = Math.max(this.max.y, y);
    }

    contains(object: Point | Line | Rectangle): boolean {
        if (object instanceof Point) {
            const {x, y} = object;
            const {top, right, bottom, left} = this;
            return x >= left && x <= right && y <= top && y >= bottom;
        } else if (object instanceof Line) {
            return this.contains(object.start) && this.contains(object.end);
        } else if (object instanceof Rectangle) {
            const {x: x1, y: y1} = this.min;
            const {x: x2, y: y2} = this.max;
            const {x: x3, y: y3} = object.min;
            const {x: x4, y: y4} = object.max;
            return x1 <= x3 && x2 >= x4 && y1 <= y3 && y2 >= y4;
        }
        return false;
    }

    equals(rect: Rectangle) {
        return this.min.equals(rect.min) && this.max.equals(rect.max);
    }

    // TODO: intersects
    // intersects(rect: Rectangle) {
    // 	const min = new Point();
    // 	const max = new Point();
    // 	const rect1 = new Rectangle(rect.min.clone(), this.max.clone());
    // 	return null;
    // }
}
