import {getObject} from "@cad-viewer";
import {ObjectOf, keysOf} from "@lucilor/utils";
import {cloneDeep} from "lodash";

export type Anchor = [number, number];

export type Gongshi = string | number;

export type BooleanCN = "是" | "否";

export interface KlkwpzItemBase {
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
    删除超出板材的孔: BooleanCN;
}

export interface KlkwpzItemType0 extends KlkwpzItemBase {
    类型: "";
}

export interface KlkwpzItemMatrixBase {
    自增方向: string;
    行数: Gongshi;
    列数: Gongshi;
    行距: Gongshi;
    列距: Gongshi;
    孔依附板材边缘: BooleanCN;
}

export interface KlkwpzItemType1 extends KlkwpzItemBase {
    类型: "增加指定偏移";
    增加指定偏移: {x: Gongshi; y: Gongshi}[];
}

export interface KlkwpzItemType2 extends KlkwpzItemBase {
    类型: "自增等距阵列";
    自增等距阵列: KlkwpzItemMatrixBase;
}

export interface KlkwpzItemType3 extends KlkwpzItemBase {
    类型: "固定行列阵列";
    固定行列阵列: KlkwpzItemMatrixBase;
}

export type KlkwpzItem = KlkwpzItemType0 | KlkwpzItemType1 | KlkwpzItemType2 | KlkwpzItemType3;

export type KailiaokongweipeizhiSource = ObjectOf<Partial<KlkwpzItem>[]>;

export interface KlkwpzItemTypeMap {
    "": KlkwpzItemType0;
    增加指定偏移: KlkwpzItemType1;
    自增等距阵列: KlkwpzItemType2;
    固定行列阵列: KlkwpzItemType3;
}

export type KlkwpzItemType = KlkwpzItem["类型"];

export class Kailiaokongweipeizhi {
    data: {key: string; value: KlkwpzItem[]}[] = [];

    constructor(source?: KailiaokongweipeizhiSource) {
        this.init(source);
    }

    private _getKlkwpzItem(source: Partial<KlkwpzItem> = {}) {
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
        let result: KlkwpzItem = {
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
            删除超出板材的孔: source.删除超出板材的孔 === "否" ? "否" : "是",
            类型: ""
        };
        if (source.类型 === "增加指定偏移") {
            result = {...result, 类型: "增加指定偏移", 增加指定偏移: []} as KlkwpzItemType1;
        }
        return result;
    }

    private _trimGongshi(gongshi: Gongshi): Gongshi {
        const num = Number(gongshi);
        if (!isNaN(num)) {
            return num;
        }
        return gongshi;
    }

    private _trimObjGongshi<T>(obj: T, keys: (keyof T)[] = keysOf(obj)) {
        keys.forEach((key) => {
            obj[key] = this._trimGongshi((obj as any)[key]) as any;
        });
    }

    private _purgeObj<T>(obj: T, keys: (keyof T)[] = keysOf(obj)) {
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
            const value = source[key].map((v) => this._getKlkwpzItem(v));
            this.data.push({key, value});
        }
    }

    export() {
        const result: KailiaokongweipeizhiSource = {};
        cloneDeep(this.data).forEach((v) => {
            v.value.forEach((vv) => {
                this._trimObjGongshi(vv.板材打孔范围缩减);
                this._purgeObj(vv.板材打孔范围缩减);
                this._trimObjGongshi(vv, ["x", "y", "maxX", "maxY", "baseX", "baseY"]);
                if (vv.类型 === "增加指定偏移") {
                    vv.增加指定偏移.forEach((vvv) => {
                        this._trimObjGongshi(vvv);
                    });
                } else if (vv.类型 === "自增等距阵列") {
                    this._trimObjGongshi(vv.自增等距阵列);
                    this._purgeObj(vv.自增等距阵列);
                } else if (vv.类型 === "固定行列阵列") {
                    this._trimObjGongshi(vv.固定行列阵列);
                    this._purgeObj(vv.固定行列阵列);
                }
                this._purgeObj(vv, ["baseX", "baseY", "maxX", "maxY", "类型", "板材打孔范围缩减"]);
            });
            result[v.key] = v.value;
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
            (item as KlkwpzItemType1).增加指定偏移 = [];
        } else if (type === "自增等距阵列" || type === "固定行列阵列") {
            const base: KlkwpzItemMatrixBase = {
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
