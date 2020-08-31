import {CadEntity} from "./cad-entity";
import {CadLayer} from "../cad-layer";
import {getVectorFromArray} from "../utils";
import {Point} from "@src/app/utils";
import {Matrix, MatrixAlias} from "@svgdotjs/svg.js";

export class CadMtext extends CadEntity {
	insert: Point;
	font_size: number;
	text: string;
	anchor: Point;

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "MTEXT";
		this.insert = getVectorFromArray(data.insert);
		this.font_size = data.font_size ?? 16;
		this.text = data.text ?? "";
		if (typeof data.anchor?.[1] === "number") {
			data.anchor[1] = data.anchor[1];
		}
		this.anchor = getVectorFromArray(data.anchor, new Point(0, 1));
	}

	export() {
		const anchor = this.anchor.toArray();
		return {
			...super.export(),
			insert: this.insert.toArray(),
			font_size: this.font_size,
			text: this.text,
			anchor
		};
	}

	transform(matrix: MatrixAlias, parent?: CadEntity) {
		super.transform(matrix);
		const m = new Matrix(matrix);
		this.insert.transform(m);
		if (this.info.isLengthText) {
			if (!Array.isArray(this.info.offset)) {
				this.info.offset = [0, 0];
			}
			if (!parent) {
				this.info.offset[0] += m.e;
				this.info.offset[1] += m.f;
			}
		}
		return this;
	}

	clone(resetId = false) {
		return new CadMtext(this, [], resetId);
	}

	equals(entity: CadMtext) {
		return (
			this.insert.equals(entity.insert) &&
			this.font_size === entity.font_size &&
			this.text === entity.text &&
			this.anchor.equals(entity.anchor)
		);
	}
}
