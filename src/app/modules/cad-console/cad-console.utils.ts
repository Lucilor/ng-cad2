import {getList} from "@app/app.common";
import {highlight} from "highlight.js";
import {v4} from "uuid";
import {Desc} from "./cad-command-types";

export const getContent = (desc: Desc): string => {
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
};

export const getEmphasized = (str: string) => `<span style='color:deeppink'>${str}</span>`;

export const getBashStyle = (str: string) => `<code class="bash hljs">${highlight("bash", str).value}</code>`;

export const spaceReplacer = v4();
