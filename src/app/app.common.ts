import {AbstractControlOptions, FormControl, FormControlOptions, FormControlState, FormGroup} from "@angular/forms";
import {environment} from "@env";
import {LocalStorage, ObjectOf, SessionStorage, Timer} from "@utils";

declare global {
    interface Window {
        parseBaobianzhengmianRules(content: string, vars?: ObjectOf<any>): {errors: string[]};
        batchCheck(data: ObjectOf<any>[]): ObjectOf<string[]>;
    }
}

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

export const routesInfo = {
    index: {path: "index", title: ""},
    printCad: {path: "print-cad", title: "打印CAD"},
    printA4A015Preview: {path: "printA4A015Preview", title: "订单配件标签"},
    import: {path: "import", title: "导入CAD"},
    export: {path: "export", title: "导出CAD"},
    backup: {path: "backup", title: "备份CAD"},
    selectBancai: {path: "select-bancai", title: "激光开料排版"},
    changelogAdmin: {path: "changelog-admin", title: "编辑更新日志"},
    kailiaokongweipeizhi: {path: "kailiaokongweipeizhi", title: "开料孔位配置"},
    replaceText: {path: "replace-text", title: "文本替换"},
    piliangjianban: {path: "piliangjianban", title: "批量剪板"},
    dingdanbiaoqian: {path: "dingdanbiaoqian", title: "订单标签"},
    selectCads: {path: "select-cads", title: "选择CAD"},
    jiaowei: {path: "jiaowei", title: "铰位"}
};

export type CadCollection =
    | "cad"
    | "CADmuban"
    | "qiliaozuhe"
    | "qieliaocad"
    | "order"
    | "kailiaocadmuban"
    | "material"
    | "zixuanpeijian"
    | "luomatoucad";

export const timer = new Timer({color: "deeppink"});
Object.assign(window, {timer});

export const getList = (content: string[]) => `<ul>${content.map((v) => `<li>${v}</li>`).join("")}</ul>`;

export const splitOptions = (str: string) => {
    if (str.includes(";")) {
        return str.split(";");
    } else {
        return str.split(",");
    }
};

export const joinOptions = (options: string[]) => options.join(";");

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
