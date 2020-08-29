import {CadEntity} from "./cad-entity";
import {CadLayer} from "../cad-layer";
import {getVectorFromArray, isBetween} from "../utils";
import {CadTransformation} from "../cad-transformation";
import {Line, Point} from "@src/app/utils";

export class CadLine extends CadEntity {
	start: Point;
	end: Point;
	mingzi: string;
	qujian: string;
	gongshi: string;
	guanlianbianhuagongshi: string;
	kongwei: string;
	nextZhewan: "自动" | "无" | "1mm" | "6mm";
	zidingzhankaichang = -1;

	get valid() {
		const {start, end} = this;
		const dx = Math.abs(start.x - end.x);
		const dy = Math.abs(start.y - end.y);
		return !isBetween(dx) && !isBetween(dy);
	}
	get curve() {
		return new Line(this.start, this.end);
	}
	get length() {
		return this.curve.length;
	}
	get slope() {
		return this.curve.slope;
	}
	get theta() {
		return this.curve.theta;
	}
	get middle() {
		return this.curve.middle;
	}
	get maxX() {
		return Math.max(this.start.x, this.end.x);
	}
	get maxY() {
		return Math.max(this.start.y, this.end.y);
	}
	get minX() {
		return Math.min(this.start.x, this.end.x);
	}
	get minY() {
		return Math.min(this.start.y, this.end.y);
	}

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "LINE";
		this.start = getVectorFromArray(data.start);
		this.end = getVectorFromArray(data.end);
		this.mingzi = data.mingzi ?? "";
		this.qujian = data.qujian ?? "";
		this.gongshi = data.gongshi ?? "";
		this.guanlianbianhuagongshi = data.guanlianbianhuagongshi ?? "";
		this.kongwei = data.kongwei ?? "";
		this.nextZhewan = data.nextZhewan ?? "自动";
		this.zidingzhankaichang = data.zidingzhankaichang ?? -1;
	}

	transform(trans: CadTransformation) {
		super.transform(trans);
		const {matrix} = trans;
		this.start.transform(matrix);
		this.end.transform(matrix);
		return this;
	}

	export() {
		return {
			...super.export(),
			start: this.start.toArray(),
			end: this.end.toArray(),
			mingzi: this.mingzi,
			qujian: this.qujian,
			gongshi: this.gongshi,
			guanlianbianhuagongshi: this.guanlianbianhuagongshi,
			kongwei: this.kongwei,
			nextZhewan: this.nextZhewan,
			zidingzhankaichang: this.zidingzhankaichang
		};
	}

	clone(resetId = false) {
		return new CadLine(this, [], resetId);
	}

	equals(entity: CadLine) {
		return this.curve.equals(entity.curve);
	}

	isVertical(accuracy = 0) {
		return Math.abs(this.start.x - this.end.x) <= accuracy;
	}

	isHorizonal(accuracy = 0) {
		return Math.abs(this.start.y - this.end.y) <= accuracy;
	}
}
