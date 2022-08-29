import {getObject} from "@cad-viewer";
import {ObjectOf, keysOf} from "@utils";
import {cloneDeep} from "lodash";

export type Anchor = [number, number];

export type Gongshi = string | number;

export type BooleanCN = "是" | "否";

export type KlkwpzItemType = "增加指定偏移" | "自增等距阵列" | "固定行列阵列";

export interface KlkwpzItem {
    name: string;
    x: Gongshi;
    y: Gongshi;
    anchor1: Anchor;
    anchor2: Anchor;
    maxX: Gongshi;
    maxY: Gongshi;
    face?: string;
    baseX?: Gongshi;
    baseY?: Gongshi;
    板材打孔范围缩减?: {上: Gongshi; 下: Gongshi; 左: Gongshi; 右: Gongshi};
    板材孔位阵列范围?: {宽: Gongshi; 高: Gongshi};
    不删除超出板材的孔?: BooleanCN;
    删除超出板材的孔X?: BooleanCN;
    删除超出板材的孔Y?: BooleanCN;
    类型?: KlkwpzItemType;
    增加指定偏移?: {x: Gongshi; y: Gongshi}[];
    自增等距阵列?: KlkwpzItemMatrix;
    固定行列阵列?: KlkwpzItemMatrix;
    孔依附板材边缘?: BooleanCN;
}

export interface KlkwpzItemMatrix {
    自增方向: string;
    行数: Gongshi;
    列数: Gongshi;
    行距: Gongshi;
    列距: Gongshi;
    孔依附板材边缘: BooleanCN;
}

export type KlkwpzItemWithoutName = Omit<KlkwpzItem, "name">;

export type KlkwpzSource = ObjectOf<Partial<KlkwpzItemWithoutName>[]>;

export class Klkwpz {
    data: KlkwpzItem[] = [];

    constructor(source?: KlkwpzSource) {
        this.init(source);
    }

    getKlkwpzItem(name: string, source: Partial<KlkwpzItem> = {}) {
        const getGongshi = (sourceGongshi?: Gongshi): Gongshi => sourceGongshi || "";
        const getAnchor = (sourceAnchor?: Anchor): Anchor => {
            if (!sourceAnchor) {
                sourceAnchor = [0, 0];
            }
            return [sourceAnchor[0], sourceAnchor[1]];
        };
        let 板材打孔范围缩减: KlkwpzItem["板材打孔范围缩减"] | undefined;
        if (source.板材打孔范围缩减) {
            板材打孔范围缩减 = {上: "", 下: "", 左: "", 右: ""};
            for (const key of keysOf(板材打孔范围缩减)) {
                板材打孔范围缩减[key] = getGongshi(source.板材打孔范围缩减?.[key]);
            }
        }
        let 板材孔位阵列范围: KlkwpzItem["板材孔位阵列范围"] | undefined;
        if (source.板材孔位阵列范围) {
            板材孔位阵列范围 = {宽: "", 高: ""};
            for (const key of keysOf(板材孔位阵列范围)) {
                板材孔位阵列范围[key] = getGongshi(source.板材孔位阵列范围[key]);
            }
        }
        const result: KlkwpzItem = {
            name,
            face: source.face || "",
            x: getGongshi(source.x),
            y: getGongshi(source.y),
            anchor1: getAnchor(source.anchor1),
            anchor2: getAnchor(source.anchor2),
            maxX: getGongshi(source.maxX),
            maxY: getGongshi(source.maxY),
            baseX: getGongshi(source.baseX),
            baseY: getGongshi(source.baseY),
            板材打孔范围缩减,
            板材孔位阵列范围,
            不删除超出板材的孔: source.不删除超出板材的孔,
            删除超出板材的孔X: source.删除超出板材的孔X,
            删除超出板材的孔Y: source.删除超出板材的孔Y,
            类型: source.类型 || undefined,
            增加指定偏移: source.增加指定偏移,
            自增等距阵列: source.自增等距阵列,
            固定行列阵列: source.固定行列阵列
        };
        return result;
    }

    private _trimGongshi(gongshi: Gongshi): Gongshi {
        // const num = Number(gongshi);
        // if (!isNaN(num)) {
        //     return num;
        // }
        return gongshi;
    }

    private _trimObjGongshi<T extends ObjectOf<any>>(obj: T, keys = keysOf(obj)) {
        keys.forEach((key) => {
            if (!(key in obj)) {
                return;
            }
            obj[key] = this._trimGongshi((obj as any)[key]) as any;
        });
    }

    private _purgeObj<T extends ObjectOf<any>>(obj: T, keys = keysOf(obj)) {
        keys.forEach((key) => {
            let value: any = obj[key];
            if (typeof value === "object") {
                if (Array.isArray(value) && value.length === 0) {
                    value = null;
                } else {
                    this._purgeObj(value);
                    if (Object.keys(value).length === 0) {
                        value = null;
                    }
                }
            }
            if (!value || value === "否") {
                delete obj[key];
            }
        });
    }

    init(source: KlkwpzSource = {}) {
        this.data = [];
        source = getObject(source);
        for (const key in source) {
            this.data.push(...source[key].map((v) => this.getKlkwpzItem(key, v)));
        }
    }

    exportItem(item: KlkwpzItem) {
        const result: KlkwpzItem = cloneDeep(item);
        if (result.板材打孔范围缩减) {
            this._trimObjGongshi(result.板材打孔范围缩减);
        } else {
            delete result.板材打孔范围缩减;
        }
        if (result.板材孔位阵列范围) {
            this._trimObjGongshi(result.板材孔位阵列范围);
        } else {
            delete result.板材孔位阵列范围;
        }
        this._trimObjGongshi(result, ["x", "y", "maxX", "maxY", "baseX", "baseY"]);
        if (result.增加指定偏移) {
            result.增加指定偏移.forEach((vvv) => {
                this._trimObjGongshi(vvv);
            });
        }
        if (result.自增等距阵列) {
            this._trimObjGongshi(result.自增等距阵列);
            this._purgeObj(result.自增等距阵列);
        }
        if (result.固定行列阵列) {
            this._trimObjGongshi(result.固定行列阵列);
            this._purgeObj(result.固定行列阵列);
        }
        this._purgeObj(result, [
            "face",
            "maxX",
            "maxY",
            "类型",
            "不删除超出板材的孔",
            "删除超出板材的孔X",
            "删除超出板材的孔Y",
            "增加指定偏移",
            "固定行列阵列",
            "自增等距阵列",
            "孔依附板材边缘"
        ]);
        delete (result as any).name;
        return result;
    }

    export() {
        const result: KlkwpzSource = {};
        this.data.forEach((vv) => {
            const name = vv.name;
            const item = this.exportItem(vv);
            if (name in result) {
                (result as any)[name].push(item);
            } else {
                (result as any)[name] = [item];
            }
        });
        return result;
    }

    setKlkwpzItemType<T extends KlkwpzItemType>(item: KlkwpzItem, type: T) {
        const keys: KlkwpzItemType[] = ["增加指定偏移", "自增等距阵列", "固定行列阵列"];
        item.类型 = type;
        keys.forEach((key) => {
            if (key !== type) {
                delete (item as any)[key];
            }
        });
        if (type === "增加指定偏移") {
            item.增加指定偏移 = [];
        } else if (type === "自增等距阵列" || type === "固定行列阵列") {
            const base: KlkwpzItemMatrix = {
                自增方向: "",
                行数: "",
                列数: "",
                行距: "",
                列距: "",
                孔依附板材边缘: "否"
            };
            (item as any)[type] = base;
        }
    }
}
