import {Container, List, Tspan} from "@svgdotjs/svg.js";
import {Vector2} from "three";
import {Angle, Arc, Point} from "../utils";

export function drawLine(draw: Container, start: Vector2, end: Vector2) {
	if (start.equals(end)) {
		draw.remove();
		return null;
	}
	return draw.line(start.x, start.y, end.x, end.y);
}

export function drawCircle(draw: Container, center: Vector2, radius: number) {
	if (radius <= 0) {
		draw.remove();
		return null;
	}
	return draw.circle(radius).center(center.x, center.y);
}

export function drawArc(draw: Container, center: Vector2, radius: number, startAngle: number, endAngle: number, clockwise: boolean) {
	if (radius <= 0) {
		draw.remove();
		return null;
	}
	const l0 = Math.PI * 2 * radius;
	const arc = new Arc(new Point(center.x, center.y), radius, new Angle(startAngle, "deg"), new Angle(endAngle, "deg"), clockwise);
	const isLargeArc = arc.length / l0 > 0.5 ? 1 : 0;
	const {x: x0, y: y0} = arc.startPoint;
	const {x: x1, y: y1} = arc.endPoint;
	return draw.path([
		["M", x0, y0],
		["A", radius, radius, endAngle - startAngle, isLargeArc, clockwise ? 0 : 1, x1, y1]
	]);
}

export function drawText(draw: Container, text: string, size: number, position: Vector2, anchor: Vector2, vertical = false) {
	if (!text) {
		draw.remove();
		return null;
	}
	const textEl = draw.text("");
	textEl.font({size}).text(text).leading(1);
	textEl.move(position.x, position.y);
	setTimeout(() => {
		const tspans = textEl.children() as List<Tspan>;
		const width = Math.max(...tspans.map((v) => v.length()));
		const height = (tspans.length + 1 / 3) * size;
		if (vertical) {
			drawCircle(draw, position, 5).fill("white");
			const dx = height * (0.5 - anchor.x);
			const dy = width * (0.5 + anchor.y);
			textEl.css("writing-mode", "vertical-lr");
			textEl.transform({a: 1, b: 0, c: 0, d: -1, e: dx, f: dy + position.y * 2});
		} else {
			const dx = -width * anchor.x;
			const dy = height * anchor.y;
			textEl.transform({a: 1, b: 0, c: 0, d: -1, e: dx, f: dy + position.y * 2});
		}
		tspans.slice(1).forEach((tspan) => tspan.dy("1em"));
	}, 0);
	return textEl;
}
