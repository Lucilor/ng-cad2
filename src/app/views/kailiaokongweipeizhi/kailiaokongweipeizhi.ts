import {getObject} from "@cad-viewer";
import {ObjectOf, keysOf} from "@utils";
import {cloneDeep} from "lodash";

export type Anchor = [number, number];

export type Gongshi = string | number;

export type BooleanCN = "是" | "否";

export type KlkwpzItemType = "增加指定偏移" | "自增等距阵列" | "固定行列阵列";
export type KlkwpzItemType2 = "自定义XY基准" | "面基准";
export type KlkwpzItemType3 = "无阵列" | "阵列范围缩减" | "阵列限定宽高" | "阵列不限制";

export interface KlkwpzItem {
    name: string;
    face: string;
    x: Gongshi;
    y: Gongshi;
    anchor1: Anchor;
    anchor2: Anchor;
    maxX: Gongshi;
    maxY: Gongshi;
    baseX: Gongshi;
    baseY: Gongshi;
    板材打孔范围缩减: {上: Gongshi; 下: Gongshi; 左: Gongshi; 右: Gongshi};
    板材孔位阵列范围: {宽: Gongshi; 高: Gongshi};
    不删除超出板材的孔?: BooleanCN;
    删除超出板材的孔X?: BooleanCN;
    删除超出板材的孔Y?: BooleanCN;
    类型: KlkwpzItemType;
    类型2: KlkwpzItemType2;
    类型3: KlkwpzItemType3;
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

export type KailiaokongweipeizhiSource = ObjectOf<Partial<KlkwpzItemWithoutName>[]>;

export class Kailiaokongweipeizhi {
    data: KlkwpzItem[] = [];

    constructor(source?: KailiaokongweipeizhiSource) {
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
        const 板材打孔范围缩减: KlkwpzItem["板材打孔范围缩减"] = {上: "", 下: "", 左: "", 右: ""};
        keysOf(板材打孔范围缩减).forEach((key) => {
            板材打孔范围缩减[key] = getGongshi(source.板材打孔范围缩减?.[key]);
        });
        const 板材孔位阵列范围: KlkwpzItem["板材孔位阵列范围"] = {宽: "", 高: ""};
        keysOf(板材孔位阵列范围).forEach((key) => {
            板材孔位阵列范围[key] = getGongshi(source.板材孔位阵列范围?.[key]);
        });
        let 类型2: KlkwpzItemType2;
        if (source.baseX && source.baseY) {
            类型2 = "自定义XY基准";
        } else {
            类型2 = "面基准";
        }
        let 类型3: KlkwpzItemType3;
        if (source.增加指定偏移 || source.自增等距阵列 || source.固定行列阵列) {
            if (板材孔位阵列范围.宽 && 板材孔位阵列范围.高) {
                类型3 = "阵列范围缩减";
            } else if (板材打孔范围缩减.上 || 板材打孔范围缩减.下 || 板材打孔范围缩减.左 || 板材打孔范围缩减.右) {
                类型3 = "阵列限定宽高";
            } else {
                类型3 = "阵列不限制";
            }
        } else {
            类型3 = "无阵列";
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
            类型: source.类型 || "增加指定偏移",
            类型2,
            类型3,
            增加指定偏移: source.增加指定偏移,
            自增等距阵列: source.自增等距阵列,
            固定行列阵列: source.固定行列阵列
        };
        return result;
    }

    private _trimGongshi(gongshi: Gongshi): Gongshi {
        const num = Number(gongshi);
        if (!isNaN(num)) {
            return num;
        }
        return gongshi;
    }

    private _trimObjGongshi<T>(obj: T, keys = keysOf(obj)) {
        keys.forEach((key) => {
            obj[key] = this._trimGongshi((obj as any)[key]) as any;
        });
    }

    private _purgeObj<T>(obj: T, keys = keysOf(obj)) {
        keys.forEach((key) => {
            let value: any = obj[key];
            if (typeof value === "object") {
                if (Array.isArray(value) && value.length === 0) {
                    value = null;
                } else if (Object.keys(value).length === 0) {
                    value = null;
                }
            }
            if (!value || value === "否") {
                delete obj[key];
            }
        });
    }

    init(source: KailiaokongweipeizhiSource = {}) {
        this.data = [];
        source = getObject(source);
        for (const key in source) {
            this.data.push(...source[key].map((v) => this.getKlkwpzItem(key, v)));
        }
    }

    export() {
        const result: KailiaokongweipeizhiSource = {};
        cloneDeep(this.data).forEach((vv) => {
            this._trimObjGongshi(vv.板材打孔范围缩减);
            this._purgeObj(vv.板材打孔范围缩减);
            this._trimObjGongshi(vv, ["x", "y", "maxX", "maxY", "baseX", "baseY"]);
            if (vv.增加指定偏移) {
                vv.增加指定偏移.forEach((vvv) => {
                    this._trimObjGongshi(vvv);
                });
            }
            if (vv.自增等距阵列) {
                this._trimObjGongshi(vv.自增等距阵列);
                this._purgeObj(vv.自增等距阵列);
            }
            if (vv.固定行列阵列) {
                this._trimObjGongshi(vv.固定行列阵列);
                this._purgeObj(vv.固定行列阵列);
            }
            this._purgeObj(vv, ["face", "baseX", "baseY", "maxX", "maxY", "类型", "板材打孔范围缩减"]);
            if (vv.name in result) {
                result[vv.name].push(vv);
            } else {
                result[vv.name] = [vv];
            }
            delete (vv as any).name;
            delete (vv as any).类型2;
            delete (vv as any).类型3;
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
