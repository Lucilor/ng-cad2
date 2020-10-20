import {SessionStorage, LocalStorage, Point} from "@app/utils";
import Color from "color";
import {createPdf} from "pdfmake/build/pdfmake";
import {CadData} from "./cad-viewer/cad-data/cad-data";
import {CadEntities} from "./cad-viewer/cad-data/cad-entities";
import {CadDimension, CadMtext} from "./cad-viewer/cad-data/cad-entity";
import {PointsMap} from "./cad-viewer/cad-data/cad-lines";
import {CadViewer} from "./cad-viewer/cad-viewer";
import {State} from "./store/state";

export type Without<T, U> = {[P in Exclude<keyof T, keyof U>]?: never};
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

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
	printA4A015Preview: "printA4A015Preview",
	import: "import",
	backup: "backup"
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
	return new Promise<never>((r) => setTimeout(() => r(), time));
}

export type Collection = "p_yuanshicadwenjian" | "cad" | "CADmuban" | "qiliaozuhe" | "qieliaocad" | "order" | "kailiaocadmuban";

export function addCadGongshi(data: CadData, ignoreTop = true) {
	removeCadGongshi(data);
	if (!ignoreTop) {
		const mtext = new CadMtext();
		const {left, bottom} = data.getBoundingRect();
		mtext.text = getCadGongshiText(data);
		mtext.insert = new Point(left, bottom - 10);
		mtext.selectable = false;
		mtext.anchor.set(0, 0);
		mtext.info.isCadGongshi = true;
		data.entities.add(mtext);
	}
	data.partners.forEach((d) => addCadGongshi(d, false));
	data.components.data.forEach((d) => addCadGongshi(d, false));
}

export function removeCadGongshi(data: CadData) {
	data.entities.mtext = data.entities.mtext.filter((e) => {
		if (e.info.isCadGongshi) {
			e.el?.remove();
			return false;
		}
		return true;
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

export async function getCadPreview(data: CadData, width = 300, height = 150, padding = 10) {
	const data2 = new CadData();
	data2.entities = new CadEntities(data.getAllEntities().export());
	data2.entities.dimension = [];
	data2.entities.mtext = [];
	const cad = new CadViewer(data2, {width, height, padding, backgroundColor: "black", hideLineLength: true, hideLineGongshi: true});
	cad.appendTo(document.body);
	await timeout(0);
	const src = cad.toBase64();
	cad.destroy();
	return src;
}

interface GlobalVars {
	cad: CadViewer;
	collection: Collection;
}
export const globalVars: GlobalVars = {
	cad: null,
	collection: "cad"
};
// define global vars for test
Reflect.defineProperty(window, "cad", {get: () => globalVars.cad});
Reflect.defineProperty(window, "collection", {get: () => globalVars.collection});
Reflect.defineProperty(window, "data0", {get: () => globalVars.cad?.data.components.data[0]});
Reflect.defineProperty(window, "data0Ex", {get: () => globalVars.cad?.data.components.data[0].export()});
Reflect.defineProperty(window, "selected", {get: () => globalVars.cad?.selected()});
Reflect.defineProperty(window, "selectedArray", {get: () => globalVars.cad?.selected().toArray()});
Reflect.defineProperty(window, "selected0", {get: () => globalVars.cad?.selected().toArray()[0]});

export function setApp(app: any) {
	Reflect.defineProperty(window, "app", {
		get() {
			return app;
		}
	});
}

export function getPointsFromMap(cad: CadViewer, map: PointsMap): State["cadPoints"] {
	return map.map((v) => {
		const {x, y} = cad.getScreenPoint(v.point.x, v.point.y);
		return {x, y, active: false};
	});
}

export function downloadFile(content: string, filename: string) {
	const link = document.createElement("a");
	link.download = filename;
	link.style.display = "none";
	const blob = new Blob([content]);
	link.href = URL.createObjectURL(blob);
	document.body.appendChild(link);
	link.click();
	URL.revokeObjectURL(link.href);
	document.body.removeChild(link);
}

export async function printCad(cad: CadViewer) {
	const data = cad.data.clone();
	removeCadGongshi(data);
	let [dpiX, dpiY] = getDPI();
	if (!(dpiX > 0) || !(dpiY > 0)) {
		console.warn("Unable to get screen dpi.Assuming dpi = 96.");
		dpiX = dpiY = 96;
	}
	const width = (210 / 25.4) * dpiX * 0.75;
	const height = (297 / 25.4) * dpiY * 0.75;
	const scaleX = 300 / dpiX / 0.75;
	const scaleY = 300 / dpiY / 0.75;
	const scale = Math.sqrt(scaleX * scaleY);
	data.getAllEntities().forEach((e) => {
		if (e.linewidth >= 0.3) {
			e.linewidth *= 3;
		}
		e.color = new Color(0);
		if (e instanceof CadDimension) {
			e.renderStyle = 2;
		}
	}, true);
	const cadPrint = new CadViewer(data, {
		...cad.config(),
		width: width * scaleX,
		height: height * scaleY,
		backgroundColor: "white",
		padding: 18 * scale,
		minLinewidth: 4,
		hideLineLength: true,
		hideLineGongshi: true
	}).appendTo(document.body);
	cadPrint.select(cadPrint.data.getAllEntities().dimension);
	await timeout(0);
	const src = (await cadPrint.toCanvas()).toDataURL();
	cadPrint.destroy();
	const pdf = createPdf({content: {image: src, width, height}, pageSize: "A4", pageMargins: 0}, {}, {微软雅黑: {}});
	const url = await new Promise<string>((resolve) => {
		pdf.getBlob((blob) => resolve(URL.createObjectURL(blob)));
	});
	return url;
}
