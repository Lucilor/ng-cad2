import {CadViewer2} from "./cad-viewer-legacy";
import {CadDimension, CadEntity, CadLine, CadMtext} from "../cad-data/cad-entity";
import Color from "color";

export interface CadStyle {
	color?: Color;
	linewidth?: number;
	fontSize?: number;
	opacity?: number;
	fontStyle?: string;
}

export class CadStylizer {
	cad: CadViewer2;
	constructor(cad: CadViewer2) {
		this.cad = cad;
	}

	get(entity: CadEntity, params: CadStyle = {}) {
		const cad = this.cad;
		const result: CadStyle = {fontStyle: "normal"};
		result.color = new Color(params.color || entity?.color || 0);
		if (cad.config.reverseSimilarColor) {
			this.correctColor(result.color);
		}
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
				result.color = new Color(0xff0000);
			}
		}

		return result;
	}

	correctColor(color: Color, threshold = 5) {
		// const {reverseSimilarColor, backgroundColor} = this.cad.config;
		// if (reverseSimilarColor) {
		// 	const colorNum = color.getHex();
		// 	if (Math.abs(colorNum - backgroundColor.brightness()) <= threshold) {
		// 		color.set(0xfffffff - colorNum);
		// 	}
		// }
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
