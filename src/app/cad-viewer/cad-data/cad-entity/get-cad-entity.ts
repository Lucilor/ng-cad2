import {CadEntity} from "./cad-entity";
import {CadType} from "../cad-types";
import {CadLayer} from "../cad-layer";
import {CadArc} from "./cad-arc";
import {CadCircle} from "./cad-circle";
import {CadDimension} from "./cad-dimension";
import {CadHatch} from "./cad-hatch";
import {CadLine} from "./cad-line";
import {CadMtext} from "./cad-mtext";

export function getCadEntity<T extends CadEntity>(data: any = {}, layers: CadLayer[] = [], resetId = false) {
	let entity: CadEntity;
	const type = data.type as CadType;
	if (type === "ARC") {
		entity = new CadArc(data, layers, resetId);
	} else if (type === "CIRCLE") {
		entity = new CadCircle(data, layers, resetId);
	} else if (type === "DIMENSION") {
		entity = new CadDimension(data, layers, resetId);
	} else if (type === "HATCH") {
		entity = new CadHatch(data, layers, resetId);
	} else if (type === "LINE") {
		entity = new CadLine(data, layers, resetId);
	} else if (type === "MTEXT") {
		entity = new CadMtext(data, layers, resetId);
	}
	if (Array.isArray(data.children)) {
		data.children.forEach((c) => entity.add(getCadEntity(c)));
	}
	return entity as T;
}
