import {keysOf} from "@utils";

export const log = (msg: string, type?: string, styles: Partial<CSSStyleDeclaration> = {}) => {
    if (typeof type === "string" && type) {
        type = `[${type}] `;
    } else {
        type = "";
    }
    const div = document.createElement("div");
    keysOf(styles).forEach((key: any) => (div.style[key] = styles[key] as any));
    const cssText = div.style.cssText;
    let msg2 = type + msg;
    if (cssText) {
        if (!msg2.includes("%c")) {
            msg2 = "%c" + msg2;
        }
        console.log(msg2, cssText);
    } else {
        console.log(msg2);
    }
};
