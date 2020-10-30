import {SessionStorage, LocalStorage} from "@app/utils";

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

export async function timeout(time = 0) {
	return new Promise<never>((r) => setTimeout(() => r(), time));
}

// export function getPointsFromMap(cad: CadViewer, map: PointsMap): State["cadPoints"] {
// 	return map.map((v) => {
// 		const {x, y} = cad.getScreenPoint(v.point.x, v.point.y);
// 		return {x, y, active: false};
// 	});
// }
