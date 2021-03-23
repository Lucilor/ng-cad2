import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {Injectable, Injector} from "@angular/core";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Response} from "@src/app/app.common";
import {ObjectOf, RSAEncrypt} from "@src/app/utils";
import {environment} from "@src/environments/environment";
import {MessageService} from "../../message/services/message.service";

/* eslint-disable @typescript-eslint/indent */
export interface HttpOptions {
    headers?:
        | HttpHeaders
        | {
              [header: string]: string | string[];
          };
    observe?: "body";
    params?:
        | HttpParams
        | {
              [param: string]: string | string[];
          };
    reportProgress?: boolean;
    responseType?: "json";
    withCredentials?: boolean;
}
/* eslint-enable @typescript-eslint/indent */

@Injectable({
    providedIn: "root"
})
export class HttpService {
    silent = false;
    loaderId = "master";
    message: MessageService;
    http: HttpClient;
    snackBar: MatSnackBar;
    baseURL = "";
    strict = true;

    constructor(injector: Injector) {
        this.message = injector.get(MessageService);
        this.http = injector.get(HttpClient);
        this.snackBar = injector.get(MatSnackBar);
    }

    protected alert(content: any) {
        if (!this.silent) {
            this.message.alert(content);
            console.log(content);
        }
    }

    async request<T>(url: string, method: "GET" | "POST", data?: ObjectOf<any>, encrypt = true, options?: HttpOptions) {
        if (!url.startsWith("http")) {
            url = `${this.baseURL}${url}`;
        }
        try {
            let response: Response<T> | null = null;
            if (method === "GET") {
                if (data) {
                    if (encrypt) {
                        url += `?data=${RSAEncrypt(data)}`;
                    } else {
                        const queryArr: string[] = [];
                        for (const key in data) {
                            if (data[key] !== undefined) {
                                queryArr.push(`${key}=${data[key]}`);
                            }
                        }
                        if (queryArr.length) {
                            url += `?${queryArr.join("&")}`;
                        }
                    }
                }
                response = await this.http.get<Response<T>>(url, options).toPromise();
            }
            if (method === "POST") {
                let files: File[] = [];
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
                        let value = data[key];
                        if (typeof value !== "string") {
                            value = JSON.stringify(value);
                        }
                        formData.append(key, value);
                    }
                }
                files.forEach((v, i) => formData.append("file" + i, v));
                response = await this.http.post<Response<T>>(url, formData, options).toPromise();
            }
            if (!response) {
                throw new Error("请求错误");
            }
            if (this.strict) {
                const code = response.code;
                if (code === 0) {
                    if (typeof response.msg === "string" && response.msg) {
                        this.message.snack(response.msg);
                    }
                    return response;
                } else if (code === 2) {
                    if (typeof response.msg === "string" && response.msg) {
                        const data2 = response.data as any;
                        let msg = response.msg;
                        if (typeof data2?.name === "string") {
                            msg += "<br>" + data2.name;
                        }
                        this.message.alert(msg);
                    }
                    return null;
                } else if (code === -2) {
                    const baseURL = environment.production ? this.baseURL : "https://localhost/n/kgs/index/";
                    location.href = `${baseURL}signUp/index#${encodeURIComponent(location.href)}`;
                    return null;
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

    async get<T>(url: string, data?: ObjectOf<any>, encrypt = true, options?: HttpOptions) {
        return await this.request<T>(url, "GET", data, encrypt, options);
    }

    async post<T>(url: string, data?: ObjectOf<any>, encrypt = true, options?: HttpOptions) {
        return await this.request<T>(url, "POST", data, encrypt, options);
    }
}
