import {SessionStorage, LocalStorage} from "@src/app/utils";

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

export interface Response<T> {
    code: number;
    msg?: string;
    data?: T;
    count?: number;
    importance?: number;
}

export type CadCollection = "p_yuanshicadwenjian" | "cad" | "CADmuban" | "qiliaozuhe" | "qieliaocad" | "order" | "kailiaocadmuban";

// export function getPointsFromMap(cad: CadViewer, map: PointsMap): State["cadPoints"] {
// 	return map.map((v) => {
// 		const {x, y} = cad.getScreenPoint(v.point.x, v.point.y);
// 		return {x, y, active: false};
// 	});
// }
