import {Injectable, Injector} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadData, CadOption} from "../cad-viewer/cad-data/cad-data";
import {AnyObject} from "../utils/types";
import {HttpService} from "./http.service";

export type CadCollection = "p_yuanshicadwenjian" | "cad" | "CADmuban" | "qiliaozuhe" | "qieliaocad" | "order" | "kailiaocadmuban";

export interface GetCadParams {
	collection: CadCollection;
	id: string;
	ids: string[];
	page: number;
	limit: number;
	search: AnyObject;
	qiliao: boolean;
	options: CadOption[];
	optionsMatchType: "and" | "or";
}

export interface SetCadParams {
	collection: CadCollection;
	cadData: CadData;
	force: boolean;
	time?: number;
}

export type CadSearchData = {
	title: string;
	items: {
		value: string;
		label: string;
		options: {value: string; label: string}[];
	}[];
}[];

@Injectable({
	providedIn: "root"
})
export class CadDataService extends HttpService {
	constructor(injector: Injector, private route: ActivatedRoute) {
		super(injector);
		this.baseURL = localStorage.getItem("baseURL") || "/api";
	}

	// async request<T>(url: string, method: "GET" | "POST", data?: AnyObject) {
	// 	const queryParams = this.route.snapshot.queryParams;
	// 	const encode = encodeURIComponent(queryParams.encode ?? "");
	// 	if (encode) {
	// 		url += "/" + encode;
	// 	}
	// 	console.log(queryParams);
	// 	return super.request<T>(url, method, data);
	// }

	async getCad(params: Partial<GetCadParams>) {
		const response = await this.request<any[]>("peijian/cad/getCad", "POST", params);
		const result: {cads: CadData[]; total: number} = {cads: [], total: 0};
		if (response && response.data) {
			response.data.forEach((d) => result.cads.push(new CadData(d)));
		}
		return result;
	}

	async setCad(params: SetCadParams) {
		const data = {...params, cadData: params.cadData.export()};
		const response = await this.request<CadData>("peijian/cad/setCad", "POST", data);
		if (response && response.data) {
			return new CadData(response.data);
		} else {
			return null;
		}
	}

	async getYuanshicadwenjian(params: Partial<GetCadParams>){
		const response = await this.request<any[]>("peijian/cad/getYuanshicadwenjian", "POST", params);
		const result: {cads: any[]; total: number} = {cads: [], total: 0};
		if (response && response.data) {
			result.cads = response.data;
		}
		return result;
	}

	async getCadSearchForm() {
		const response = await this.request("peijian/cad/getSearchForm", "GET");
		if (response) {
			return response.data as CadSearchData;
		}
		return [];
	}

	async getCadSearchOptions(table: string) {
		const response = await this.request("peijian/cad/getSearchOptions", "POST", {table});
		if (response) {
			return response.data as CadSearchData[0]["items"][0];
		}
		return null;
	}

	async downloadDxf(data: CadData) {
		const result = await this.request<any>("peijian/cad/downloadDxf", "POST", {cadData: data.export()});
		const host = this.baseURL === "/api" ? "//localhost" : origin;
		if (result) {
			open(host + "localhost/" + result.data.path);
		}
	}

	async uploadDxf(dxf: File) {
		const response = await this.request<any>("peijian/cad/uploadDxf", "POST", {dxf});
		if (response) {
			return new CadData(response.data);
		}
		return null;
	}

	async replaceData(source: CadData, target: string, collection?: CadCollection) {
		source.sortComponents();
		const response = await this.request<any>("peijian/cad/replaceCad", "POST", {
			source: source.export(),
			target,
			collection
		});
		if (response) {
			return new CadData(response.data);
		}
		return null;
	}

	async getOptions(
		data: CadData,
		name: string,
		search: string,
		page: number = 1,
		limit: number = 10
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
		const response = await this.request<any>("peijian/cad/getOptions", "POST", postData);
		if (response) {
			return {
				data: response.data.map((v: any) => {
					return {name: v.mingzi, img: `${origin}/filepath/${v.xiaotu}`};
				}),
				count: response.count || 0
			};
		}
		return {data: [], count: 0};
	}

	async getBackupCads() {
		const response = await this.request("peijian/cad/getBackupCads", "POST");
		if (response) {
			const result = response.data as {time: number; cads: CadData[]}[];
			result.forEach((v) => {
				v.cads = v.cads.map((vv) => new CadData(vv));
			});
			return result;
		}
		return null;
	}

	async removeBackup(time: number) {
		const response = await this.request("peijian/cad/removeBackup", "POST", {time});
		return response ? true : false;
	}

	async getSuanliaodan(codes: string[]) {
		const response = await this.request<any[]>("order/order/suanliaodan", "POST", {codes});
		if (response?.data) {
			const data: CadData[] = response.data.map((v) => new CadData(v));
			return data;
		} else {
			return [];
		}
	}
}
