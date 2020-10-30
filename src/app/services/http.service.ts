import {HttpClient} from "@angular/common/http";
import {Injectable, Injector} from "@angular/core";
import {Response} from "../app.common";
import {MessageService} from "../modules/message/services/message.service";
import {RSAEncrypt} from "../utils";
import {AnyObject, Nullable} from "../utils/types";

@Injectable({
	providedIn: "root"
})
export class HttpService {
	silent = false;
	loaderId = "master";
	message: MessageService;
	http: HttpClient;
	baseURL = "";
	strict = true;

	constructor(injector: Injector) {
		this.message = injector.get(MessageService);
		this.http = injector.get(HttpClient);
	}

	protected alert(content: any) {
		if (!this.silent) {
			this.message.alert(content);
			console.log(content);
		}
	}

	async request<T>(url: string, method: "GET" | "POST", data?: AnyObject, encrypt = true) {
		url = `${this.baseURL}/${url}`;
		try {
			let response: Nullable<Response<T>>;
			if (method === "GET") {
				if (data) {
					if (encrypt) {
						url += `?data=${RSAEncrypt(data)}`;
					} else {
						const queryArr: string[] = [];
						for (const key in data) {
							queryArr.push(`${key}=${data[key]}`);
						}
						if (queryArr.length) {
							url += `?${queryArr.join("&")}`;
						}
					}
				}
				response = await this.http.get<Response<T>>(url).toPromise();
			}
			if (method === "POST") {
				let files: File[];
				for (const key in data) {
					const value = data[key];
					if (value instanceof FileList) {
						files = Array.from(value);
						delete data[key];
					}
					if (value instanceof File) {
						files = [value];
						delete data[key];
					}
				}
				const formData = new FormData();
				if (encrypt) {
					formData.append("data", RSAEncrypt(data));
				} else {
					for (const key in data) {
						formData.append(key, data[key]);
					}
				}
				response = await this.http.post<Response<T>>(url, formData).toPromise();
			}
			if (!response) {
				throw new Error("请求错误");
			}
			if (this.strict) {
				if (response.code === 0) {
					return response;
				} else {
					throw new Error(response.msg);
				}
			} else {
				return response;
			}
		} catch (error) {
			this.alert(error);
			return null;
		}
	}
}
