import {highlight} from "highlight.js";
import {v4} from "uuid";
import {Desc} from "./cad-command-types";

export function getList(content: string[]) {
    return `<ul>${content.map((v) => `<li>${v}</li>`).join("")}</ul>`;
}

export function getContent(desc: Desc): string {
    if (!desc) {
        return "";
    }
    if (typeof desc === "string") {
        return desc;
    }
    let content = desc.content;
    const sub = desc.sub?.map((v) => getContent(v));
    if (sub) {
        content += "<br>" + getList(sub);
    }
    return content;
}

export function getEmphasized(str: string) {
    return `<span style='color:deeppink'>${str}</span>`;
}

export function getBashStyle(str: string) {
    return `<code class="bash hljs">${highlight("bash", str).value}</code>`;
}

export const spaceReplacer = v4();
