import {Circle, Container, Line, Path, PathArrayAlias, Text} from "@svgdotjs/svg.js";
import {Angle, Arc, Point} from "../utils";

export function drawLine(draw: Container, start: Point, end: Point, i = 0) {
	if (start.equals(end)) {
		draw.remove();
		return null;
	}
	let el = draw.children()[i] as Line;
	if (el instanceof Line) {
		el.plot(start.x, start.y, end.x, end.y);
	} else {
		el = draw.line(start.x, start.y, end.x, end.y).addClass("stroke").fill("none");
	}
	return [el];
}

export function drawCircle(draw: Container, center: Point, radius: number, i = 0) {
	if (radius <= 0) {
		draw.remove();
		return null;
	}
	let el = draw.children()[i] as Circle;
	if (el instanceof Line) {
		el.size(radius).center(center.x, center.y);
	} else {
		el = draw.circle(radius).center(center.x, center.y).addClass("stroke").fill("none");
	}
	return [el];
}

export function drawArc(draw: Container, center: Point, radius: number, startAngle: number, endAngle: number, clockwise: boolean, i = 0) {
	if (radius <= 0) {
		draw.remove();
		return null;
	}
	const l0 = Math.PI * 2 * radius;
	const arc = new Arc(new Point(center.x, center.y), radius, new Angle(startAngle, "deg"), new Angle(endAngle, "deg"), clockwise);
	const isLargeArc = arc.length / l0 > 0.5 ? 1 : 0;
	const {x: x0, y: y0} = arc.startPoint;
	const {x: x1, y: y1} = arc.endPoint;
	const path: PathArrayAlias = [
		["M", x0, y0],
		["A", radius, radius, endAngle - startAngle, isLargeArc, clockwise ? 0 : 1, x1, y1]
	];
	let el = draw.children()[i] as Path;
	if (el instanceof Path) {
		el.plot(path);
	} else {
		el = draw.path(path).addClass("stroke").fill("none");
	}
	return [el];
}

export function drawText(draw: Container, text: string, size: number, position: Point, anchor: Point, vertical = false, i = 0) {
	if (!text || !(size > 0)) {
		draw.remove();
		return null;
	}
	let el = draw.children()[i] as Text;
	if (el instanceof Text) {
		el.text(text).font({size});
	} else {
		el = draw.text(text).addClass("fill").stroke("none");
		el.css("transform-box", "fill-box");
		el.font({size}).leading(1);
	}
	if (vertical) {
		el.css("writing-mode", "vertical-lr");
		el.css("transform", `translate(${-anchor.x * 100}%, ${(anchor.y - 1) * 100}%) scale(1, -1) rotate(180deg)`);
	} else {
		el.css("writing-mode", "");
		el.css("transform", `translate(${-anchor.x * 100}%, ${anchor.y * 100}%) scale(1, -1)`);
	}
	el.move(position.x, position.y);
	return [el];
}

export function drawShape(draw: Container, points: Point[], type: "fill" | "stroke", i = 0) {
	let el = draw.children()[i] as Path;
	const path = points
		.map((p, i) => {
			const {x, y} = p;
			if (i === 0) {
				return `M${x} ${y}`;
			} else {
				return `L${x} ${y}`;
			}
		})
		.join(" ");
	if (el instanceof Path) {
		el.plot(path);
	} else {
		el = draw.path(path).addClass("fill stroke");
	}
	return [el];
}

export function drawDimension(draw: Container, points: Point[], text: string, axis: "x" | "y", fontSize: number, i = 0) {
	if (points.length < 8 || !(fontSize > 0)) {
		draw.remove();
		return null;
	}
	const [p1, p2, p3, p4, p5, p6, p7, p8] = points;
	// const l1 = drawLine(draw, p1, p3, i)[0];
	// const l2 = drawLine(draw, p3, p4, i + 1)[0];
	// const l3 = drawLine(draw, p4, p2, i + 2)[0];
	let l1: Line;
	let l2: Line;
	const length = 20;
	if (axis === "x") {
		l1 = drawLine(draw, p3.clone().sub(0, length), p3.clone().add(0, length), i)[0];
		l2 = drawLine(draw, p4.clone().sub(0, length), p4.clone().add(0, length), i + 1)[0];
	} else if (axis === "y") {
		l1 = drawLine(draw, p3.clone().sub(length, 0), p3.clone().add(length, 0), i)[0];
		l2 = drawLine(draw, p4.clone().sub(length, 0), p4.clone().add(length, 0), i + 1)[0];
	}
	const l3 = drawLine(draw, p3, p4, i + 2)[0];
	const tri1 = drawShape(draw, [p3, p5, p6], "fill", i + 3)[0];
	const tri2 = drawShape(draw, [p4, p7, p8], "fill", i + 4)[0];
	text = text.replace("<>", p3.distanceTo(p4).toFixed(2));
	const middle = p3.clone().add(p4).divide(2);
	let textEl: Text;
	if (axis === "x") {
		textEl = drawText(draw, text, fontSize, middle, new Point(0.5, 1), false, i + 5)[0];
	} else if (axis === "y") {
		textEl = drawText(draw, text, fontSize, middle, new Point(0, 0.5), true, i + 5)[0];
	}
	return [l1, l2, l3, tri1, tri2, textEl];
}