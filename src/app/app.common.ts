import {AbstractControlOptions, FormControl, FormControlOptions, FormControlState, FormGroup} from "@angular/forms";
import {environment} from "@env";
import {LocalStorage, log, ObjectOf, SessionStorage, Timer} from "@lucilor/utils";

declare global {
  interface Window {
    parseBaobianzhengmianRules(content: string, vars?: ObjectOf<any>): {errors: string[]};
    batchCheck(data: ObjectOf<any>[]): ObjectOf<string[]>;
  }
}
export const remoteHost = "https://www.let888.cn" as const;
const addJs = (name: string) => {
  const script = document.createElement("script");
  script.src = `${remoteHost}/static/js/${name}.js?${new Date().getTime()}`;
  document.head.append(script);
};
addJs("batchUploadChecker");
addJs("node2rect");

export const projectName = "NgCad2";
export const session = new SessionStorage(projectName);
export const local = new LocalStorage(projectName);

export const imgEmpty = "assets/images/empty.jpg";
export const imgCadEmpty = "assets/images/cad-empty.png";
export const imgLoading = "assets/images/loading.gif";
export const publicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzDn9P27uGK+wuoO2AG7j
7vHQtN93Q0zxfbeQlBYVTEe0BZ4MXg10xGab/NBHqLQxLyQf1QOwYYQTzVS/ajje
ItFGUqQsAuZMUqxW9vL/Xk7QMLCbseOyEb82mOZ/DZXij1zEjaqVhonV5W8n6VVJ
5RO6Vk/EZ2gcGEELGwqQOb2ItVjINLDZLzV9Sb+VXxZiv/eYfvcqAYGuOTgRsjVG
Ys+u2YRp2VGNaNcLbd+Z3AsAZiCqzZR5H0cJnySg6axHEKa1I5RIGFVmCHBONv5x
ZyOT2GCZPEv6TnMvmWLpIk9QpjrSEkn5E11YlCN9g5ekk31RbVdb9GkxNzz8iLzM
VwIDAQAB
-----END PUBLIC KEY-----
`;

export const splitOptions = (str: string) => {
  if (!str) {
    return [];
  }
  const regExps = [/[;；]/, /[，,]/, /[*]/];
  for (const regExp of regExps) {
    if (regExp.test(str)) {
      return str.split(regExp);
    }
  }
  return [str];
};

export const joinOptions = (options: (string | {mingzi: string})[], separator: ";" | "," | "*" = ";") => {
  const values: string[] = [];
  for (const option of options) {
    const value = typeof option === "string" ? option : option.mingzi;
    if (value && !values.includes(value)) {
      values.push(value);
    }
  }
  return values.join(separator);
};

export const replaceChars = (str: string) => {
  const fullChars2HalfChars: ObjectOf<string> = {
    "“": '"',
    "”": '"',
    "。": ".",
    "，": ",",
    "？": "?",
    "！": "!",
    "；": ";",
    "：": ":",
    "‘": "'",
    "’": "'",
    "（": "(",
    "）": ")"
  };
  let tmp = "";
  for (const char of str) {
    if (typeof fullChars2HalfChars[char] === "string") {
      tmp += fullChars2HalfChars[char];
    } else {
      tmp += char;
    }
  }
  return tmp;
};

export type TypedFormGroup<T extends ObjectOf<any>> = FormGroup<{[K in keyof T]: FormControl<T[K]>}>;

export const getFormControl = <T>(value: T | FormControlState<T>, opts: FormControlOptions = {}) =>
  new FormControl(value, {...opts, nonNullable: true});

export const getFormGroup = <T extends ObjectOf<any>>(controls: {[K in keyof T]: FormControl<T[K]>}, opts?: AbstractControlOptions) =>
  new FormGroup(controls, opts);

export const setGlobal = <T>(key: string, value: T, production = false) => {
  if (!production && environment.production) {
    return;
  }
  (window as any)[key] = value;
  // Reflect.defineProperty(window, key, {value});
};

export const getFormControlErrorString = (control: FormControl) => {
  const errors = control.errors;
  if (!errors) {
    return null;
  }
  const mapFn = (str: string) => {
    switch (str) {
      case "required":
        return "必填";
      default:
        return str;
    }
  };
  return Object.keys(errors).map(mapFn).join(", ");
};

export type ProjectConfig = ObjectOf<string>;

export const timer = new Timer({color: "deeppink"});
setGlobal("timer", timer);
setGlobal("log", log);

export const replaceRemoteHost = (url: string) => {
  if (!environment.production && url.startsWith(remoteHost)) {
    return url.replace(remoteHost, window.origin);
  }
  return url;
};

export interface XiaodaohangStructure {
  mingzi: string;
}

export const getFilepathUrl = (url: string, opts?: {prefix?: string; suffix?: string}) => {
  if (!url) {
    return "";
  }
  const {prefix, suffix} = opts || {};
  let result = `${origin}/filepath/${url}`;
  if (prefix || suffix) {
    const strs = url.split("/");
    if (strs.length > 0) {
      strs[strs.length - 1] = `${prefix || ""}${strs[strs.length - 1]}${suffix || ""}`;
    }
    result = `${origin}/filepath/${strs.join("/")}`;
  }
  return result;
};
