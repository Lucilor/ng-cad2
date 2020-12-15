import {SessionStorage, LocalStorage} from "@src/app/utils";
import {environment} from "@src/environments/environment";

export const projectName = "NgCad";
export const session = new SessionStorage(projectName);
export const local = new LocalStorage(projectName);

export const imgEmpty = "assets/images/empty.jpg";
export const imgLoading = "assets/images/loading.gif";

export const paths = {
    index: "index",
    printCad: "print-cad",
    test: "test",
    printA4A015Preview: "printA4A015Preview",
    import: "import",
    backup: "backup",
    selectBancai: "select-bancai"
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

export const toFixedTrim = (num: number, fractionDigits?: number | undefined) => {
    const str = num.toFixed(fractionDigits);
    return str.replace(/\.[1-9]*0+/, "");
};

// export function getPointsFromMap(cad: CadViewer, map: PointsMap): State["cadPoints"] {
// 	return map.map((v) => {
// 		const {x, y} = cad.getScreenPoint(v.point.x, v.point.y);
// 		return {x, y, active: false};
// 	});
// }
