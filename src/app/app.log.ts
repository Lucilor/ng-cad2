import {keysOf} from "@utils";

const DEFAULT_STYLES = {color: "deeppink"};

export const log = (msg: string, type?: string, styles = DEFAULT_STYLES) => {
    if (typeof type === "string") {
        type = `[${type}] `;
    } else {
        type = "";
    }
    const styleArr: string[] = [];
    keysOf(styles).forEach((key) => styleArr.push(`${key}:${styles[key]}`));
    console.log(`%c${type}${msg}`, styleArr.join(";"));
};
