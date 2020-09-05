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

export function drawText(draw: Container, text: string, size: number, position: Point, anchor: Point, vertical: boolean, i = 0) {
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
	el.css("writing-mode", vertical ? "vertical-lr" : "lr");
	el.css("transform", `translate(${-anchor.x * 100}%, ${anchor.y * 100}%) scale(1, -1)`);
	el.move(position.x, position.y);
	return [el];
}

export function drawTriangle(draw: Container, p1: Point, p2: Point, p3: Point, i = 0) {
	let el = draw.children()[i] as Path;
	const path: PathArrayAlias = `M${p1.x} ${p1.y} L${p2.x} ${p2.y} L${p3.x} ${p3.y}`;
	if (el instanceof Path) {
		el.plot(path);
	} else {
		el = draw.path(path).addClass("fill").stroke("none");
	}
	return [el];
}

export function drawDimension(draw: Container, points: Point[], text: string, axis: "x" | "y", fontSize: number, i = 0) {
	if (points.length < 8 || !(fontSize > 0)) {
		draw.remove();
		return null;
	}
	const [p1, p2, p3, p4, p5, p6, p7, p8] = points;
	const l1 = drawLine(draw, p1, p3, i)[0];
	const l2 = drawLine(draw, p3, p4, i + 1)[0];
	const l3 = drawLine(draw, p4, p2, i + 2)[0];
	const tri1 = drawTriangle(draw, p3, p5, p6, i + 3)[0];
	const tri2 = drawTriangle(draw, p4, p7, p8, i + 4)[0];
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
