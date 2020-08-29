import {CadViewer} from "./cad-viewer";
import {CadEntity} from "./cad-data/cad-entity/cad-entity";
import {CadMtext} from "./cad-data/cad-entity/cad-mtext";
import {CadDimension} from "./cad-data/cad-entity/cad-dimension";
import Color from "color";
import {CadLine} from "./cad-data/cad-entity/cad-line";

export interface CadStyle {
	color?: string;
	linewidth?: number;
	fontSize?: number;
	opacity?: number;
	fontStyle?: string;
}

export class CadStylizer {
	cad: CadViewer;
	constructor(cad: CadViewer) {
		this.cad = cad;
	}

	get(entity: CadEntity, params: CadStyle = {}) {
		const cad = this.cad;
		const result: CadStyle = {fontStyle: "normal"};
		let color = new Color(params.color || entity?.color || 0);
		if (params.linewidth > 0) {
			result.linewidth = params.linewidth;
		} else if (entity.linewidth > 0) {
			result.linewidth = entity.linewidth;
		} else {
			result.linewidth = 1;
		}
		let eFontSize: number = null;
		if (entity instanceof CadMtext || entity instanceof CadDimension) {
			eFontSize = entity.font_size;
		}
		result.fontSize = params.fontSize || eFontSize || 16;
		result.opacity = entity.opacity;
		if (typeof params.opacity === "number") {
			result.opacity = params.opacity;
		}

		if (cad.config.validateLines && entity instanceof CadLine) {
			if (!entity.valid || entity.info.error) {
				result.linewidth *= 10;
				color = new Color(0xff0000);
			}
		}

		if (cad.config.reverseSimilarColor) {
			color = this.correctColor(color);
		}
		result.color = color.hex();

		return result;
	}

	correctColor(color: Color, threshold = 5) {
		const {reverseSimilarColor, backgroundColor} = this.cad.config;
		if (reverseSimilarColor) {
			if (Math.abs(color.rgbNumber() - backgroundColor.rgbNumber()) <= threshold) {
				return color.negate();
			}
		}
		return color;
	}

	getColorStyle(color: Color, a = 1) {
		const arr = [color.red(), color.green(), color.blue()].map((v) => v * 255);
		if (a > 0 && a < 1) {
			return `rgba(${[...arr, a].join(",")})`;
		} else {
			return `rgb(${arr.join(",")})`;
		}
	}
}
