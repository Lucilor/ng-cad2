import {CadEntity} from "./cad-entity";
import {Vector2} from "three";
import {CadLayer} from "../cad-layer";
import {getVectorFromArray} from "../utils";
import {CadTransformation} from "../cad-transformation";

export class CadMtext extends CadEntity {
	insert: Vector2;
	font_size: number;
	text: string;
	anchor: Vector2;

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "MTEXT";
		this.insert = getVectorFromArray(data.insert);
		this.font_size = data.font_size ?? 16;
		this.text = data.text ?? "";
		if (typeof data.anchor?.[1] === "number") {
			data.anchor[1] = data.anchor[1];
		}
		this.anchor = getVectorFromArray(data.anchor, new Vector2(0, 1));
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

	transform(trans: CadTransformation, parent?: CadEntity) {
		super.transform(trans);
		const {matrix} = trans;
		this.insert.applyMatrix3(matrix);
		if (this.info.isLengthText) {
			if (!Array.isArray(this.info.offset)) {
				this.info.offset = [0, 0];
			}
			if (!parent) {
				this.info.offset[0] += trans.translate.x;
				this.info.offset[1] += trans.translate.y;
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
