import {HttpHeaders, HttpParams} from "@angular/common/http";
import hljs from "highlight.js";

export interface CustomResponse<T> {
  code: number;
  msg?: string;
  data?: T;
  count?: number;
  importance?: number;
  duration?: number;
  title?: string;
}

export type DataEncrpty = "yes" | "no" | "both";

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

export class HttpServiceResponseError extends Error {
  details: string;

  constructor(public response: CustomResponse<any>) {
    const {msg, data: responseData} = response;
    let message = "";
    let details = "";
    if (msg) {
      message = msg;
    } else if (responseData !== null && responseData !== undefined) {
      const dataJson = JSON.stringify(responseData, null, 2);
      message = dataJson;
      details = hljs.highlight("json", dataJson).value.replace(/\n/g, "<br>");
      details = `<pre class="hljs">${details}</pre>`;
    } else {
      message = "未知错误";
    }
    super(message);
    this.details = details;
  }
}
