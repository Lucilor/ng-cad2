import {HttpClient, HttpErrorResponse, HttpHeaders, HttpParams} from "@angular/common/http";
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
  duration?: number;
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
  bypassCodes?: number[];
  silent?: boolean;
  encrypt?: DataEncrpty;
  testData?: string;
  offlineMode?: boolean;
}
/* eslint-enable @typescript-eslint/indent */

@Injectable({
  providedIn: "root"
})
export class HttpService {
  loaderId = "master";
  protected dialog: MatDialog;
  protected message: MessageService;
  protected http: HttpClient;
  protected snackBar: MatSnackBar;
  baseURL = "";
  strict = true;
  private _loginPromise: ReturnType<typeof openLoginFormDialog> | null = null;
  lastResponse: CustomResponse<any> | null = null;
  offlineMode = false;

  constructor(injector: Injector) {
    this.dialog = injector.get(MatDialog);
    this.message = injector.get(MessageService);
    this.http = injector.get(HttpClient);
    this.snackBar = injector.get(MatSnackBar);
  }

  protected alert(content: any, silent: boolean) {
    if (!silent) {
      this.message.alert({content});
    }
  }

  protected snack(msg: string, silent: boolean) {
    if (!silent) {
      this.message.snack(msg);
    }
  }

  private async _waitForLogin(project?: LoginFormData["project"]) {
    if (!project) {
      project = {id: "", name: "未知"};
    }
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

  async request<T>(url: string, method: "GET" | "POST", data?: ObjectOf<any>, options?: HttpOptions): Promise<CustomResponse<T> | null> {
    const testData = options?.testData;
    let offlineMode = this.offlineMode;
    if (typeof options?.offlineMode === "boolean") {
      offlineMode = options.offlineMode;
    }
    const getTestData = async (): Promise<CustomResponse<T>> => {
      const data2 = await lastValueFrom(this.http.get<T>(`${location.origin}/assets/testData/${testData}.json`, options));
      return {code: 0, msg: "", data: data2};
    };
    if ((offlineMode && !environment.production) || environment.unitTest) {
      if (testData) {
        return await getTestData();
      } else {
        return null;
      }
    }
    const rawData = {...data};
    const encrypt = options?.encrypt ?? "no";
    const silent = !!options?.silent;
    const timerName = `http.request.${url}.${timer.now}`;
    timer.start(timerName);
    const rawUrl = url;
    if (!url.startsWith("http")) {
      url = `${this.baseURL}${url}`;
    }
    let response: CustomResponse<T> | null = null;
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
          } else if (data && typeof data === "object") {
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
        const bypassCodes = options?.bypassCodes ?? [];
        if (code === 0 || bypassCodes.includes(code)) {
          if (typeof response.msg === "string" && response.msg) {
            if (response.msg.match(/\n|<br>/)) {
              this.alert(response.msg, silent);
            } else {
              this.snack(response.msg, silent);
            }
          }
          return response;
        } else if (code === 2) {
          if (typeof response.msg === "string" && response.msg) {
            const data2 = response.data as any;
            let msg = response.msg;
            if (typeof data2?.name === "string") {
              msg += "<br>" + data2.name;
            }
            this.alert(msg, silent);
          }
          return null;
        } else if (code === -2) {
          await this._waitForLogin((response.data as any)?.project);
          return this.request(url, method, rawData, options);
        } else {
          throw new Error(response.msg);
        }
      } else {
        return response;
      }
    } catch (error) {
      if (testData) {
        return await getTestData();
      }
      if (error instanceof HttpErrorResponse) {
        const text = error.error?.text;
        if (typeof text === "string" && text.includes("没有权限")) {
          await this._waitForLogin();
          return this.request(url, method, rawData, options);
        }
      }
      console.error(error);
      this.alert(error, silent);
      return response;
    } finally {
      this.lastResponse = response;
      if (response) {
        response.duration = timer.getDuration(timerName);
      }
      if (silent) {
        timer.end(timerName);
      } else {
        timer.end(timerName, `${method} ${rawUrl}`);
      }
    }
  }

  async get<T>(url: string, data?: ObjectOf<any>, options?: HttpOptions) {
    return await this.request<T>(url, "GET", data, options);
  }

  async post<T>(url: string, data?: ObjectOf<any>, options?: HttpOptions) {
    return await this.request<T>(url, "POST", data, options);
  }
}
