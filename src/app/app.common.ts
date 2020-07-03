import {environment} from "src/environments/environment";
import {SessionStorage, LocalStorage} from "@lucilor/utils";

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
