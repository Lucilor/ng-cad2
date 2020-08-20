import {Vector2} from "three";
import {CadEntities} from "./cad-entities";
import {CadLine} from "./cad-entity/cad-line";
import {CadArc} from "./cad-entity/cad-arc";
import {CadData} from "./cad-data";
import {CadViewer} from "../cad-viewer";
import {State} from "@src/app/store/state";
import {CadMtext} from "./cad-entity/cad-mtext";
import {CadTransformation} from "./cad-transformation";
import {CadEntity} from "./cad-entity/cad-entity";
import {getVectorFromArray, isBetween} from "./utils";

export type LineLike = CadLine | CadArc;

export type PointsMap = {
	point: Vector2;
	lines: LineLike[];
	selected: boolean;
}[];

export const DEFAULT_TOLERANCE = 0.01;

export function generatePointsMap(entities: CadEntities, tolerance = DEFAULT_TOLERANCE) {
	const map: PointsMap = [];
	const addToMap = (point: Vector2, line: CadLine | CadArc) => {
		const linesAtPoint = map.find((v) => v.point.distanceTo(point) <= tolerance);
		if (linesAtPoint) {
			linesAtPoint.lines.push(line);
		} else {
			map.push({point, lines: [line], selected: false});
		}
	};
	entities.line.forEach((entity) => {
		const {start, end} = entity;
		if (start.distanceTo(end) > 0) {
			addToMap(start, entity);
			addToMap(end, entity);
		}
	});
	entities.arc.forEach((entity) => {
		const curve = entity.curve;
		if (curve.getLength() > 0) {
			addToMap(curve.getPoint(0), entity);
			addToMap(curve.getPoint(1), entity);
		}
	});
	return map;
}

export function getPointsFromMap(cad: CadViewer, map: PointsMap): State["cadPoints"] {
	return map.map((v) => {
		const {x, y} = cad.getScreenPoint(v.point);
		return {x, y, active: false};
	});
}

export function findAdjacentLines(map: PointsMap, entity: LineLike, point?: Vector2, tolerance = DEFAULT_TOLERANCE): LineLike[] {
	if (!point && entity instanceof CadLine) {
		const adjStart = findAdjacentLines(map, entity, entity.start);
		const adjEnd = findAdjacentLines(map, entity, entity.end);
		return [...adjStart, ...adjEnd];
	}
	const pal = map.find((v) => v.point.distanceTo(point) <= tolerance);
	if (pal) {
		const lines = pal.lines.filter((v) => v.id !== entity.id);
		return lines;
	}
	return [];
}

export function findAllAdjacentLines(map: PointsMap, entity: LineLike, point: Vector2, tolerance = DEFAULT_TOLERANCE) {
	const entities: LineLike[] = [];
	const id = entity.id;
	let closed = false;
	const maxStack = 1000;
	let stack = 0;
	while (entity && point && stack++ < maxStack) {
		entity = findAdjacentLines(map, entity, point, tolerance)[0];
		if (entity?.id === id) {
			closed = true;
			break;
		}
		if (entity) {
			if (entity instanceof CadLine) {
				entities.push(entity);
				const {start, end} = entity;
				if (start.distanceTo(point) <= tolerance) {
					point = end;
				} else if (end.distanceTo(point) < tolerance) {
					point = start;
				} else {
					point = null;
				}
			}
			if (entity instanceof CadArc) {
				entities.push(entity);
				const curve = entity.curve;
				const start = curve.getPoint(0);
				const end = curve.getPoint(1);
				if (start.distanceTo(point) <= tolerance) {
					point = end;
				} else if (end.distanceTo(point) <= tolerance) {
					point = start;
				} else {
					point = null;
				}
			}
		}
	}
	return {entities, closed};
}

export function setLinesLength(cad: CadViewer, lines: CadLine[], length: number) {
	const pointsMap = generatePointsMap(cad.data.getAllEntities());
	lines.forEach((line) => {
		if (line instanceof CadLine) {
			const {entities} = findAllAdjacentLines(pointsMap, line, line.end);
			const d = line.length - length;
			const theta = line.theta;
			const translate = new Vector2(Math.cos(theta), Math.sin(theta)).multiplyScalar(d);
			line.end.add(translate);
			entities.forEach((e) => e.transform(new CadTransformation({translate})));
		}
	});
}

export function swapStartEnd(entity: LineLike) {
	if (entity instanceof CadLine) {
		[entity.start, entity.end] = [entity.end, entity.start];
	}
	if (entity instanceof CadArc) {
		[entity.start_angle, entity.end_angle] = [entity.end_angle, entity.start_angle];
		entity.clockwise = !entity.clockwise;
	}
}

export function sortLines(data: CadData, tolerance = DEFAULT_TOLERANCE) {
	const entities = data.getAllEntities();
	const result: LineLike[][] = [];
	if (entities.length === 0) {
		return result;
	}
	let map = generatePointsMap(entities);
	let arr: PointsMap = [];
	map.forEach((v) => {
		if (v.lines.length === 1) {
			arr.push(v);
		}
	});
	if (arr.length < 1) {
		// * 每个点都有不止条线, 说明图形闭合
		arr = map;
	}
	arr.sort((a, b) => {
		const l1 = a.lines[0];
		const l2 = b.lines[0];
		let notStart1 = 1;
		let notStart2 = 1;
		if (l1 instanceof CadLine && l1.mingzi === "起始线") {
			notStart1 = 0;
		}
		if (l2 instanceof CadLine && l2.mingzi === "起始线") {
			notStart2 = 0;
		}
		return notStart1 - notStart2;
	});
	const exclude = [];
	for (const v of arr) {
		const startLine = v.lines[0];
		if (exclude.includes(startLine.id)) {
			continue;
		}
		if (v.point.equals(startLine.end)) {
			swapStartEnd(startLine);
			map = generatePointsMap(entities);
		}
		const startPoint = startLine.end;
		const adjLines = findAllAdjacentLines(map, startLine, startPoint).entities;
		for (let i = 1; i < adjLines.length; i++) {
			const prev = adjLines[i - 1];
			const curr = adjLines[i];
			if (prev.end.distanceTo(curr.start) > tolerance) {
				swapStartEnd(curr);
			}
		}
		if (adjLines.length) {
			exclude.push(adjLines[adjLines.length - 1].id);
		} else {
			exclude.push(startLine.id);
		}
		const lines = [startLine, ...adjLines];
		result.push(lines);
	}
	for (const j in result) {
		const group = result[j];
		for (let i = 1; i < group.length; i++) {
			const prev = group[i - 1];
			const curr = group[i];
			if (prev instanceof CadLine && curr instanceof CadLine && prev.slope === curr.slope) {
				prev.end = curr.end;
				curr.start.set(0, 0);
				curr.end.set(0, 0);
			}
			if (prev.end.distanceTo(curr.start) > tolerance) {
				if (curr instanceof CadLine) {
					[curr.start, curr.end] = [curr.end, curr.start];
				} else {
					[curr.start_angle, curr.end_angle] = [curr.end_angle, curr.start_angle];
				}
			}
		}
		result[j] = group.filter((e) => e.length > 0);
	}
	return result;
}

export function validateLines(data: CadData, tolerance = DEFAULT_TOLERANCE) {
	const lines = sortLines(data, tolerance);
	const result = {valid: true, errMsg: "", lines};
	lines.forEach((v) => v.forEach((vv) => (vv.info.error = false)));
	if (lines.length < 1) {
		result.valid = false;
		result.errMsg = "没有线";
	} else if (lines.length > 1) {
		result.valid = false;
		result.errMsg = "线分成了多段";
		let lastEnd: Vector2;
		lines.forEach((group, i) => {
			if (i === 0) {
				group[group.length - 1].info.error = true;
				lastEnd = group[group.length - 1].end;
			} else {
				const start = group[0].start;
				const end = group[group.length - 1].end;
				if (lastEnd.distanceTo(start) < lastEnd.distanceTo(end)) {
					group[0].info.error = true;
					lastEnd = end;
				} else {
					group[group.length - 1].info.error = true;
					lastEnd = start;
				}
			}
		});
	}
	return result;
}

export function generateLineTexts(data: CadData, fontSizes: {length: number; gongshi: number}, tolerance = DEFAULT_TOLERANCE) {
	const lines = sortLines(data, tolerance);
	const removed: CadEntity[] = [];
	lines.forEach((group) => {
		let cp = 0;
		const length = group.length;
		if (length < 1) {
			return;
		} else if (length === 1) {
			cp = 1;
		} else {
			const middle = group[Math.floor(length / 2)].middle;
			const start = group[0].start;
			const end = group[length - 1].end;
			const v1 = middle.clone().sub(start);
			const v2 = middle.clone().sub(end);
			cp = v1.x * v2.y - v1.y * v2.x;
			// ? 差积等于0时视为1
			if (cp === 0) {
				cp = 1;
			}
		}
		group.forEach((line) => {
			let theta: number;
			if (line instanceof CadLine) {
				theta = line.theta;
				// return;
			} else {
				theta = new CadLine({start: line.start, end: line.end}).theta;
			}
			if (cp > 0) {
				theta += Math.PI / 2;
			} else {
				theta -= Math.PI / 2;
			}
			const offset = new Vector2(Math.cos(theta), Math.sin(theta));
			const outer = line.middle.clone().add(offset);
			const inner = line.middle.clone().sub(offset);
			const anchor = new Vector2(0.5, 0.5);
			let {x, y} = offset;
			if (Math.abs(x) > Math.abs(y)) {
				y = 0;
			} else {
				x = 0;
			}
			if (Math.abs(x) > tolerance) {
				if (x > 0) {
					anchor.x = 0;
				} else {
					anchor.x = 1;
				}
			}
			if (Math.abs(y) > tolerance) {
				if (y > 0) {
					anchor.y = 0;
				} else {
					anchor.y = 1;
				}
			}

			let lengthText = line.children.find((c) => c.info.isLengthText) as CadMtext;
			if (fontSizes.length > 0) {
				if (!(lengthText instanceof CadMtext)) {
					lengthText = new CadMtext();
					lengthText.info.isLengthText = true;
					line.add(lengthText);
				}
				const offset = getVectorFromArray(lengthText.info.offset);
				lengthText.insert.copy(offset.add(outer));
				lengthText.text = Math.round(line.length).toString();
				lengthText.font_size = fontSizes.length;
				lengthText.anchor.copy(anchor);
			} else {
				line.remove(lengthText);
				removed.push(lengthText);
			}

			let gongshiText = line.children.find((c) => c.info.isGongshiText) as CadMtext;
			if (fontSizes.gongshi > 0) {
				if (!(gongshiText instanceof CadMtext)) {
					gongshiText = new CadMtext();
					gongshiText.info.isGongshiText = true;
					line.add(gongshiText);
					gongshiText.insert.copy(inner);
				}
				gongshiText.text = line.gongshi;
				gongshiText.font_size = fontSizes.gongshi;
				gongshiText.anchor.set(1 - anchor.x, 1 - anchor.y);
			} else {
				line.remove(gongshiText);
				removed.push(gongshiText);
			}
		});
	});
	return removed;
}

export function autoFixLine(cad: CadViewer, line: CadLine, tolerance = DEFAULT_TOLERANCE) {
	const {start, end} = line;
	const dx = start.x - end.x;
	const dy = start.y - end.y;
	const translate = new Vector2();
	if (isBetween(Math.abs(dx))) {
		translate.x = dx;
	}
	if (isBetween(Math.abs(dy))) {
		translate.y = dy;
	}
	const map = generatePointsMap(cad.data.getAllEntities(), tolerance);
	const {entities} = findAllAdjacentLines(map, line, line.end, tolerance);
	const trans = new CadTransformation({translate});
	entities.forEach((e) => e.transform(trans));
	line.end.add(translate);
}
