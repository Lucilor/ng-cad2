import {environment} from "src/environments/environment";
import {SessionStorage, LocalStorage} from "@lucilor/utils";
import {CadData} from "./cad-viewer/cad-data/cad-data";
import {CadMtext} from "./cad-viewer/cad-data/cad-entity/cad-mtext";
import {Vector2} from "three";

const host = environment.host;
// export const apiBasePath = host + "/n/zy/index";
export const apiBasePath = localStorage.getItem("baseURL");

export const projectName = "NgCad";

export const session = new SessionStorage(projectName);

export const local = new LocalStorage(projectName);

export const paths = {
	index: "index"
};

export interface Response {
	code: number;
	msg?: string;
	data?: any;
	count?: number;
	importance?: number;
}

export function checkLogout(response: string, execute = true) {
	if (typeof response === "string") {
		const match = response.replace(/\r\n|\n/g, "").match(/<script>(.*)<\/script>/);
		if (match) {
			if (execute) {
				window.eval(match[1]);
			}
			return true;
		}
	}
	return false;
}

export async function timeout(time = 0) {
	return new Promise((r) => setTimeout(() => r(), time));
}

export type Collection = "p_yuanshicadwenjian" | "cad" | "CADmuban" | "qiliaozuhe" | "qieliaocad";

export function addCadGongshi(data: CadData) {
	const mtext = new CadMtext();
	const {x, y, width, height} = data.getAllEntities().getBounds();
	mtext.text = getCadGongshiText(data);
	mtext.insert = new Vector2(x - width / 2, y - height / 2 - 10);
	mtext.selectable = false;
	mtext.info.isCadGongshi = true;
	data.entities.add(mtext);
	data.partners.forEach((d) => addCadGongshi(d));
	data.components.data.forEach((d) => addCadGongshi(d));
}

export function removeCadGongshi(data: CadData) {
	data.entities.mtext = data.entities.mtext.filter((e) => !e.info.isCadGongshi);
	data.partners.forEach((d) => removeCadGongshi(d));
	data.components.data.forEach((d) => removeCadGongshi(d));
}

export function getCadGongshiText(data: CadData) {
	const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
	let text = `${zhankaikuan} x ${zhankaigao} = ${shuliang}`;
	if (Number(shuliangbeishu) > 1) {
		text += " x " + shuliangbeishu;
	}
	return text;
}
