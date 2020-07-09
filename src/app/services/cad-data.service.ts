import {Injectable} from "@angular/core";
import {Store} from "@ngrx/store";
import {State} from "../store/state";
import {HttpClient} from "@angular/common/http";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MessageComponent} from "../components/message/message.component";
import {LoadingAction} from "../store/actions";
import {Response, session, Collection} from "../app.common";
import {CadData, CadOption} from "../cad-viewer/cad-data/cad-data";
import {CadViewer} from "../cad-viewer/cad-viewer";
import {RSAEncrypt} from "@lucilor/utils";
import {Expressions} from "../cad-viewer/cad-data/utils";

export interface Order {
	vid: string;
	code: string;
	s_designPic: string;
}

@Injectable({
	providedIn: "root"
})
export class CadDataService {
	baseURL: string;
	encode = "";
	data = "";
	silent = false;
	constructor(private store: Store<State>, private http: HttpClient, private dialog: MatDialog, private snackBar: MatSnackBar) {
		this.baseURL = localStorage.getItem("baseURL");
		if (!this.baseURL && location.origin === "http://localhost:4200") {
			this.baseURL = "/api";
		}
	}

	private alert(content: any) {
		if (!this.silent) {
			this.dialog.open(MessageComponent, {data: {type: "alert", content}});
		}
	}

	private async _request(url: string, name: string, method: "GET" | "POST", postData: any = {}, encrypt = true) {
		if (!this.baseURL) {
			return null;
		}
		const {baseURL, encode, data} = this;
		this.store.dispatch<LoadingAction>({type: "add loading", name});
		url = `${baseURL}/${url}/${encode}`;
		if (postData && typeof postData !== "string") {
			if (encrypt) {
				postData = RSAEncrypt(postData);
			}
		}
		if (data) {
			url += `?data=${data}`;
		}
		try {
			let response: Response;
			if (method === "GET") {
				response = await this.http.get<Response>(url).toPromise();
			}
			if (method === "POST") {
				const formData = new FormData();
				if (encrypt) {
					formData.append("data", postData);
				} else {
					for (const key in postData) {
						formData.append("key", postData[key]);
					}
				}
				response = await this.http.post<Response>(url, formData).toPromise();
			}
			if (response.code === 0) {
				return response;
			} else {
				throw new Error(response.msg);
			}
		} catch (error) {
			this.alert(error);
			return null;
		} finally {
			this.store.dispatch<LoadingAction>({type: "remove loading", name});
		}
	}

	async getCadData(postData?: string | {id?: string; ids?: string[]; collection?: Collection}) {
		if (!postData) {
			return [];
		}
		const response = await this._request("peijian/cad/getCad", "getCadData", "POST", postData);
		if (!response) {
			return [];
		}
		if (!Array.isArray(response.data)) {
			response.data = [response.data];
		}
		const result: CadData[] = [];
		response.data.forEach((d) => result.push(new CadData(d)));
		return result;
	}

	async postCadData(cadData: CadData[], data?: string) {
		const {baseURL, encode} = this;
		if (!data) {
			data = this.data;
		}
		if (cadData.length < 1) {
			return [];
		}
		cadData.forEach((d) => d.sortComponents());
		const result: CadData[] = [];
		let counter = 0;
		let successCounter = 0;
		this.store.dispatch<LoadingAction>({
			type: "set loading progress",
			name: "postCadData",
			progress: 0
		});
		return new Promise<CadData[]>(async (resolve) => {
			for (let i = 0; i < cadData.length; i++) {
				const formData = new FormData();
				if (data) {
					formData.append("data", data);
				}
				const d = cadData[i];
				formData.append("cadData", JSON.stringify(d.export()));
				try {
					const response = await this.http.post<Response>(`${baseURL}/peijian/cad/setCAD/${encode}`, formData).toPromise();
					if (response.code === 0) {
						result[i] = new CadData(response.data);
						successCounter++;
					} else {
						throw new Error(response.msg);
					}
				} catch (error) {
					result[i] = new CadData();
				} finally {
					counter++;
				}
				this.store.dispatch<LoadingAction>({
					type: "set loading progress",
					name: "postCadData",
					progress: counter / cadData.length
				});
				if (counter >= cadData.length) {
					setTimeout(() => {
						this.store.dispatch<LoadingAction>({
							type: "set loading progress",
							name: "postCadData",
							progress: -1
						});
					}, 200);
					if (successCounter === counter) {
						this.snackBar.open(`${successCounter > 1 ? "全部" : ""}成功`);
						resolve(result);
					} else {
						this.snackBar.open(`${counter > 1 ? (successCounter > 0 ? "部分" : "全部") : ""}失败`);
						resolve(null);
					}
					// resolve(result);
				}
			}
		});
	}

	async getCadDataPage(
		collection: Collection,
		page: number,
		limit: number,
		search?: string,
		options?: CadOption[],
		optionsMatchType: "and" | "or" = "and",
		qiliao = false
	) {
		const postData = {page, limit, search, options, collection, optionsMatchType, qiliao};
		const response = await this._request("peijian/cad/getCad", "getCadDataPage", "POST", postData);
		if (!response) {
			return {data: [], count: 0};
		}
		const result: CadData[] = [];
		response.data.forEach((d) => result.push(new CadData(d)));
		return {data: result, count: response.count};
	}

	async getCadListPage(collection: Collection, page: number, limit: number, search?: string) {
		const postData = {page, limit, search, collection};
		const response = await this._request("peijian/cad/getCadList", "getCadDataPage", "POST", postData);
		if (!response) {
			return {data: [], count: 0};
		}
		return {data: response.data, count: response.count};
	}

	async replaceData(source: CadData, target: string, collection?: Collection) {
		source.sortComponents();
		const response = await this._request("peijian/cad/replaceCad", "replaceData", "POST", {
			source: source.export(),
			target,
			collection
		});
		if (!response) {
			return null;
		}
		this.snackBar.open(response.msg);
		return new CadData(response.data);
	}

	saveCadStatus(cad: CadViewer, field: string) {
		const status = {id: cad.data.id, position: cad.position.toArray()};
		session.save(field, status);
		return status;
	}

	loadCadStatus(cad: CadViewer, field: string) {
		const status = session.load(field);
		if (status && status.id === cad.data.id) {
			if (Array.isArray(status.position)) {
				cad.position.set(status.position[0], status.position[1], status.position[2]);
			}
			return status;
		} else {
			return null;
		}
	}

	async getOptions(
		data: CadData,
		name: string,
		search: string,
		page: number,
		limit: number
	): Promise<{data: {name: string; img: string}[]; count: number}> {
		const exportData = data.export();
		const postData = {
			name,
			search,
			page,
			limit,
			mingzi: exportData.name,
			fenlei: exportData.type,
			xuanxiang: exportData.options,
			tiaojian: exportData.conditions
		};
		const response = await this._request("peijian/cad/getOptions", "getOptions", "POST", postData);
		if (response) {
			return {
				data: response.data.map((v: any) => {
					return {name: v.mingzi, img: `${origin}/filepath/${v.xiaotu}`};
				}),
				count: response.count
			};
		}
		return {data: [], count: 0};
	}

	async getShowLineInfo() {
		const response = await this._request("peijian/cad/showLineInfo", "getShowLineInfo", "GET");
		return response ? (response.data as boolean) : false;
	}

	async getSampleFormulas() {
		const response = await this._request("peijian/Houtaisuanliao/getSampleFormulas", "getSampleFormulas", "GET");
		return response ? (response.data as string[]) : [];
	}

	async getOrders(data: CadData) {
		const exportData = data.export();
		const postData = {options: exportData.options, conditions: exportData.conditions};
		const response = await this._request("order/order/getOrders", "getOrders", "POST", postData);
		if (response) {
			return response.data as Order[];
		}
		return [];
	}

	async getOrderExpressions(order: Order) {
		const response = await this._request("order/order/getOrderGongshi", "getOrders", "POST", {order});
		if (response) {
			const exps = response.data as Expressions;
			for (const key in exps) {
				if (typeof exps[key] === "number") {
					exps[key] = exps[key].toString();
				}
			}
		}
		return response ? (response.data as Expressions) : {};
	}

	async downloadDxf(data: CadData) {
		const result = await this._request("peijian/cad/downloadDxf", "downloadDxf", "POST", {cadData: data.export()});
		const host = this.baseURL === "/api" ? "http://www.n.com:12305/" : origin;
		if (result) {
			open(host + "/" + result.data.path);
		}
	}

	async saveAsDxf(data: CadData, path: string) {
		const response = await this._request("peijian/cad/saveAsDxf", "saveAsDxf", "POST", {cadData: data.export(), path});
		return response ? response.data : null;
	}
}
