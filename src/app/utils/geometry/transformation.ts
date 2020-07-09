import {Point} from "./point";

export class Transformation {
	translate: Point;
	flip: {vertical: boolean; horizontal: boolean};
	rotate: {angle: number};
	anchor: Point;
	// get matrix() {
	// 	const matrix = new Matrix3();
	// 	const {translate, flip, rotate, anchor} = this;
	// 	const {x: tx, y: ty} = translate;
	// 	const sx = flip.horizontal ? -1 : 1;
	// 	const sy = flip.vertical ? -1 : 1;
	// 	const {angle} = rotate;
	// 	matrix.setUvTransform(tx, ty, sx, sy, angle, anchor.x, anchor.y);
	// 	return matrix;
	// }

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
