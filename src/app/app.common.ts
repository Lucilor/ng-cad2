import {SessionStorage, LocalStorage, Point} from "@app/utils";
import {CadData} from "./cad-viewer/cad-data/cad-data";
import {CadEntities} from "./cad-viewer/cad-data/cad-entities";
import {CadMtext} from "./cad-viewer/cad-data/cad-entity";
import {CadViewer} from "./cad-viewer/cad-viewer";

// const host = environment.host;
// export const apiBasePath = host + "/n/zy/index";
export const apiBasePath = localStorage.getItem("baseURL");

export const projectName = "NgCad";
export const session = new SessionStorage(projectName);
export const local = new LocalStorage(projectName);

export const imgEmpty = "assets/images/empty.jpg";
export const imgLoading = "assets/images/loading.gif";

export const paths = {
	index: "index",
	"print-cad": "print-cad",
	test: "test",
	printA4A015Preview: "printA4A015Preview"
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

export type Collection = "p_yuanshicadwenjian" | "cad" | "CADmuban" | "qiliaozuhe" | "qieliaocad" | "order" | "kailiaocadmuban";

export function addCadGongshi(data: CadData) {
	const mtext = new CadMtext();
	const {left, bottom} = data.getBoundingRect();
	mtext.text = getCadGongshiText(data);
	mtext.insert = new Point(left, bottom - 10);
	mtext.selectable = false;
	mtext.anchor.set(0, 0);
	mtext.info.isCadGongshi = true;
	data.entities.add(mtext);
	data.partners.forEach((d) => addCadGongshi(d));
	data.components.data.forEach((d) => addCadGongshi(d));
}

export function removeCadGongshi(data: CadData) {
	data.entities.mtext = data.entities.mtext.filter((e) => {
		if (e.info.isCadGongshi) {
			e.el?.remove();
		}
		return !e.info.isCadGongshi;
	});
	data.partners.forEach((d) => removeCadGongshi(d));
	data.components.data.forEach((d) => removeCadGongshi(d));
}

export function getCadGongshiText(data: CadData) {
	const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
	let text = `${zhankaikuan} × ${zhankaigao} = ${shuliang}`;
	if (Number(shuliangbeishu) > 1) {
		text += " × " + shuliangbeishu;
	}
	return text;
}

export function copyToClipboard(str: string) {
	const el = document.createElement("textarea");
	el.value = str;
	el.setAttribute("readonly", "");
	el.style.position = "absolute";
	el.style.opacity = "0";
	document.body.appendChild(el);
	el.select();
	document.execCommand("copy");
	document.body.removeChild(el);
}

export function getDPI() {
	const result = Array<number>();
	const tmpNode = document.createElement("div");
	tmpNode.style.cssText = "width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:99;visibility:hidden";
	document.body.appendChild(tmpNode);
	result[0] = tmpNode.offsetWidth;
	result[1] = tmpNode.offsetHeight;
	tmpNode.parentNode.removeChild(tmpNode);
	return result;
}

// TODO: get collection
export function getCollection() {
	// tslint:disable-next-line: no-string-literal
	return window["app"]?.console?.collection as Collection;
}

const timeMap = {};
export function getInterval(field: string) {
	const now = performance.now();
	if (timeMap[field] === undefined) {
		timeMap[field] = now;
	}
	const interval = now - timeMap[field];
	timeMap[field] = now;
	return interval;
}

export interface Command {
	name: string;
	desc?: string;
	args: {name: string; defaultValue?: string; value?: string; isBoolean?: boolean; desc?: string}[];
}

export async function getCadPreview(data: CadData, width = 300, height = 150, padding = 10) {
	const data2 = new CadData();
	data2.entities = new CadEntities(data.getAllEntities().export());
	data2.entities.dimension = [];
	data2.entities.mtext = [];
	const cad = new CadViewer(data2, {width, height, padding, backgroundColor: "black"});
	cad.appendTo(document.body);
	await timeout(0);
	const src = cad.toBase64();
	cad.destroy();
	return src;
}
