import {LocalStorage, SessionStorage} from "@utils";
import {Timer} from "./app.timer";

export const projectName = "NgCad2";
export const session = new SessionStorage(projectName);
export const local = new LocalStorage(projectName);

export const imgEmpty = "assets/images/empty.jpg";
export const imgLoading = "assets/images/loading.gif";

export const routesInfo = {
    index: {path: "index", title: ""},
    printCad: {path: "print-cad", title: "打印CAD"},
    printA4A015Preview: {path: "printA4A015Preview", title: "订单配件标签"},
    import: {path: "import", title: "导入CAD"},
    backup: {path: "backup", title: "备份CAD"},
    selectBancai: {path: "select-bancai", title: ""},
    changelogAdmin: {path: "changelog-admin", title: "编辑更新日志"},
    kailiaokongweipeizhi: {path: "kailiaokongweipeizhi", title: "开料孔位配置"},
    replaceText: {path: "replace-text", title: "文本替换"},
    piliangjianban: {path: "piliangjianban", title: "批量剪板"}
};

export interface Response<T> {
    code: number;
    msg?: string;
    data?: T;
    count?: number;
    importance?: number;
}

export type CadCollection = "p_yuanshicadwenjian" | "cad" | "CADmuban" | "qiliaozuhe" | "qieliaocad" | "order" | "kailiaocadmuban";

export const timer = new Timer();
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
