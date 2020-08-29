import {Point} from "@src/app/utils";
import {Matrix} from "@svgdotjs/svg.js";

export class CadTransformation {
	translate: Point;
	flip: {vertical: boolean; horizontal: boolean};
	rotate: {angle: number};
	anchor: Point;
	get matrix() {
		const matrix = new Matrix();
		const {translate, flip, rotate, anchor} = this;
		matrix.translate(translate.x, translate.y);
		matrix.rotate(rotate.angle, anchor.x, anchor.y);
		matrix.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
		return matrix;
	}

	constructor(
		params: {
			translate?: Point;
			flip?: {vertical?: boolean; horizontal?: boolean};
			rotate?: {angle?: number};
			anchor?: Point;
		} = {}
	) {
		this.anchor = params.anchor || new Point();
		this.translate = params.translate || new Point();
		{
			const {vertical = false, horizontal = false} = params.flip || {};
			this.flip = {vertical, horizontal};
		}
		{
			const {angle = 0} = params.rotate || {};
			this.rotate = {angle};
		}
	}
}
