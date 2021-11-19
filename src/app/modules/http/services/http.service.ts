import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {Injectable, Injector} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {publicKey, timer} from "@app/app.common";
import {LoginFormData, openLoginFormDialog} from "@components/dialogs/login-form/login-form.component";
import {environment} from "@env";
import {MessageService} from "@modules/message/services/message.service";
import {RSA, ObjectOf} from "@utils";
import {lastValueFrom} from "rxjs";

export interface CustomResponse<T> {
    code: number;
    msg?: string;
    data?: T;
    count?: number;
    importance?: number;
}

export type DataEncrpty = "yes" | "no" | "both";

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
    protected dialog: MatDialog;
    protected message: MessageService;
    protected http: HttpClient;
    protected snackBar: MatSnackBar;
    baseURL = "";
    strict = true;
    private _loginPromise: ReturnType<typeof openLoginFormDialog> | null = null;
    lastResponse: CustomResponse<any> | null = null;
    encrypt: DataEncrpty = "no";
    private _nextEncrypt: DataEncrpty | null = null;

    constructor(injector: Injector) {
        this.dialog = injector.get(MatDialog);
        this.message = injector.get(MessageService);
        this.http = injector.get(HttpClient);
        this.snackBar = injector.get(MatSnackBar);
    }

    protected alert(content: any) {
        if (!this.silent) {
            this.message.alert({content});
        }
    }

    protected snack(msg: string) {
        if (!this.silent) {
            this.message.snack(msg);
        }
    }

    private async _waitForLogin(project: LoginFormData["project"]) {
        if (!this._loginPromise) {
            this._loginPromise = openLoginFormDialog(this.dialog, {
                data: {project, baseUrl: this.baseURL},
                autoFocus: true,
                hasBackdrop: true,
                disableClose: true
            });
        }
        await this._loginPromise;
        if (this._loginPromise) {
            this._loginPromise = null;
        }
    }

    setNextEncrypt(encrypt: DataEncrpty) {
        this._nextEncrypt = encrypt;
    }

    async request<T>(url: string, method: "GET" | "POST", data?: ObjectOf<any>, options?: HttpOptions): Promise<CustomResponse<T> | null> {
        const rawData = {...data};
        if (environment.unitTest) {
            return null;
        }
        const timerName = `http.request.${url}.${timer.now}`;
        timer.start(timerName);
        const rawUrl = url;
        if (!url.startsWith("http")) {
            url = `${this.baseURL}${url}`;
        }
        let response: CustomResponse<T> | null = null;
        const encrypt = this._nextEncrypt ?? this.encrypt;
        try {
            if (method === "GET") {
                if (data) {
                    if (encrypt !== "no") {
                        url += `?data=${RSA.encrypt(data, publicKey)}`;
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
                response = await lastValueFrom(this.http.get<CustomResponse<T>>(url, options));
            }
            if (method === "POST") {
                let files: {file: File; key: string}[] = [];
                for (const key in data) {
                    const value = data[key];
                    if (value instanceof FileList) {
                        files = Array.from(value).map((file, i) => ({file, key: `${key}${i}`}));
                        delete data[key];
                    }
                    if (value instanceof File) {
                        files = [{file: value, key}];
                        delete data[key];
                    }
                }
                const formData = new FormData();
                if (encrypt === "yes") {
                    formData.append("data", RSA.encrypt(data, publicKey));
                } else if (encrypt === "no") {
                    if (typeof data === "string") {
                        formData.append("data", data);
                    } else {
                        formData.append("data", JSON.stringify(data));
                    }
                } else {
                    for (const key in data) {
                        formData.append(key, data[key]);
                    }
                }
                files.forEach((v) => formData.append(v.key, v.file));
                response = await lastValueFrom(this.http.post<CustomResponse<T>>(url, formData, options));
            }
            if (!response) {
                throw new Error("请求错误");
            }
            if (this.strict) {
                const code = response.code;
                if (code === 0) {
                    if (typeof response.msg === "string" && response.msg) {
                        this.snack(response.msg);
                    }
                    return response;
                } else if (code === 2) {
                    if (typeof response.msg === "string" && response.msg) {
                        const data2 = response.data as any;
                        let msg = response.msg;
                        if (typeof data2?.name === "string") {
                            msg += "<br>" + data2.name;
                        }
                        this.alert(msg);
                    }
                    return null;
                } else if (code === -2) {
                    await this._waitForLogin((response.data as any)?.project || {id: -1, name: "无"});
                    return this.request(url, method, rawData, options);
                } else {
                    throw new Error(response.msg);
                }
            } else {
                return response;
            }
        } catch (error) {
            this.alert(error);
            return null;
        } finally {
            this.lastResponse = response;
            timer.end(timerName, `${method} ${rawUrl}`);
            this._nextEncrypt = null;
        }
    }

    async get<T>(url: string, data?: ObjectOf<any>, options?: HttpOptions) {
        return await this.request<T>(url, "GET", data, options);
    }

    async post<T>(url: string, data?: ObjectOf<any>, options?: HttpOptions) {
        return await this.request<T>(url, "POST", data, options);
    }
}
