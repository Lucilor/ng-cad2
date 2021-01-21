import {SessionStorage, LocalStorage, ObjectOf} from "@src/app/utils";
import {environment} from "@src/environments/environment";

export const projectName = "NgCad2";
export const session = new SessionStorage(projectName);
export const local = new LocalStorage(projectName);

export const imgEmpty = "assets/images/empty.jpg";
export const imgLoading = "assets/images/loading.gif";

export const routesInfo: ObjectOf<{path: string; title: string}> = {
    index: {path: "index", title: ""},
    printCad: {path: "print-cad", title: "打印CAD"},
    printA4A015Preview: {path: "printA4A015Preview", title: "订单配件标签"},
    import: {path: "import", title: "导入CAD",},
    backup: {path: "backup", title: "备份CAD"},
    selectBancai: {path: "select-bancai", title: "激光开料排版"}
};

export interface Response<T> {
    code: number;
    msg?: string;
    data?: T;
    count?: number;
    importance?: number;
}

export type CadCollection = "p_yuanshicadwenjian" | "cad" | "CADmuban" | "qiliaozuhe" | "qieliaocad" | "order" | "kailiaocadmuban";

export const logTime = (content: string, start: number, fractionDigits = 2) => {
    if (environment.production) {
        return;
    }
    const time = (performance.now() - start) / 1000;
    let str = "";
    if (typeof fractionDigits === "number") {
        str = time.toFixed(fractionDigits);
    } else {
        str = time.toString();
    }
    console.log(`%c[DEBUG] ${content}: ${str}s`, "color:deeppink");
};

// export function getPointsFromMap(cad: CadViewer, map: PointsMap): State["cadPoints"] {
// 	return map.map((v) => {
// 		const {x, y} = cad.getScreenPoint(v.point.x, v.point.y);
// 		return {x, y, active: false};
// 	});
// }
