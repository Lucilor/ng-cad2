import {SafeUrl} from "@angular/platform-browser";
import {CadViewerConfig, CadData, CadMtext} from "@cad-viewer";
import {KailiaocanshuData} from "@components/klcs/klcs.component";
import {KlkwpzSource} from "@components/klkwpz/klkwpz";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {Formulas} from "@src/app/utils/calc";
import zxpjTestData from "@src/assets/testData/zixuanpeijian.json";
import zixuanpeijianTypesInfo from "@src/assets/testData/zixuanpeijianTypesInfo.json";
import {ObjectOf} from "@utils";
import {isEmpty} from "lodash";

export interface ZixuanpeijianTypesInfoItem {
    id: number;
    xiaoguotu: string;
    gongshishuru: string[][];
    xuanxiangshuru: string[][];
    shuchuwenben: string[][];
    suanliaogongshi: Formulas;
    shuchubianliang: string[];
    xinghaozhuanyong: string[];
    mokuaishuoming: string;
    unique: boolean;
    shuruzongkuan: boolean;
    shuruzonggao: boolean;
    standalone?: boolean;
}
export type ZixuanpeijianTypesInfo = ObjectOf<ObjectOf<ZixuanpeijianTypesInfoItem>>;

export interface ZixuanpeijianTypesInfoItem2 extends ZixuanpeijianTypesInfoItem {
    disableAdd?: boolean;
}
export type ZixuanpeijianTypesInfo2 = ObjectOf<ObjectOf<ZixuanpeijianTypesInfoItem2>>;

export interface ZixuanpeijianInputsInfoItem {
    totalWidth: InputInfo;
    totalHeight: InputInfo;
    gongshishuru: InputInfo[][];
}
export type ZixuanpeijianInputsInfos = ObjectOf<ObjectOf<ZixuanpeijianInputsInfoItem>>;

export interface ZixuanpeijianData {
    模块?: ZixuanpeijianMokuaiItem[];
    零散?: ZixuanpeijianCadItem[];
    备注?: CadMtext[];
    文本映射?: ObjectOf<string>;
    输出变量?: ObjectOf<string>;
    测试数据?: Formulas[];
}

export interface ZixuanpeijianInput {
    step: number;
    data?: ZixuanpeijianData;
    checkEmpty?: boolean;
    cadConfig?: Partial<CadViewerConfig>;
    order?: {code: string; type: string; materialResult?: Formulas};
    dropDownKeys?: string[];
    stepFixed?: boolean;
    可替换模块?: boolean;
    step1Data?: Step1Data;
}

export type ZixuanpeijianOutput = Required<ZixuanpeijianData>;

export interface ZixuanpeijianInfo {
    houtaiId: string;
    zhankai: {width: string; height: string; num: string; originalWidth: string; cadZhankaiIndex?: number; custom?: boolean}[];
    calcZhankai: any[];
    bancai?: BancaiList & {cailiao?: string; houdu?: string};
    translate?: [number, number];
    hidden?: boolean;
    开料孔位配置?: KlkwpzSource;
    开料参数?: KailiaocanshuData;
}

export interface Bancai extends BancaiList {
    cailiao?: string;
    houdu?: string;
}

export interface ZixuanpeijianCadItem {
    data: CadData;
    displayedData?: CadData;
    info: ZixuanpeijianInfo;
}

export interface ZixuanpeijianMokuaiItem extends ZixuanpeijianTypesInfoItem {
    type1: string;
    type2: string;
    totalWidth: string;
    totalHeight: string;
    cads: ZixuanpeijianCadItem[];
    可替换模块?: ZixuanpeijianMokuaiItem[];
}

export interface CadItemInputInfo {
    zhankai: {
        width: InputInfo;
        height: InputInfo;
        num: InputInfo;
    }[];
    板材: InputInfo;
    材料: InputInfo;
    厚度: InputInfo;
}

export interface MokuaiInputInfos {
    总宽: InputInfo;
    总高: InputInfo;
    公式输入: InputInfo[];
    选项输入: InputInfo[];
    输出文本: InputInfo[];
    cads: CadItemInputInfo[];
}

export interface ZixuanpeijianlingsanCadItem {
    data: CadData;
    img: SafeUrl;
    hidden: boolean;
}

export interface CadItemContext {
    $implicit: ZixuanpeijianCadItem;
    i: number;
    j: number;
    type: "模块" | "零散";
}

export interface Step1Data {
    prefix: string;
    typesInfo: ZixuanpeijianTypesInfo;
    options: ObjectOf<string[]>;
}

export const getTestData = () => {
    const data: Required<ZixuanpeijianInput> = {
        step: 1,
        checkEmpty: true,
        stepFixed: false,
        cadConfig: {},
        data: {
            模块: zxpjTestData.模块.map((item) => ({
                ...item,
                cads: item.cads.map((cadItem) => ({...cadItem, data: new CadData()}))
            })),
            零散: zxpjTestData.模块.flatMap((item) => item.cads.map((cadItem) => ({...cadItem, data: new CadData()})))
        },
        order: {code: "1", type: "order", materialResult: zxpjTestData.输出变量},
        dropDownKeys: ["总宽", "总高"],
        可替换模块: true,
        step1Data: zixuanpeijianTypesInfo
    };
    return data;
};

export const importZixuanpeijian = (source: ZixuanpeijianData = {}) => {
    const result: ZixuanpeijianOutput = {
        模块: [],
        零散: [],
        备注: [],
        文本映射: {},
        输出变量: {},
        测试数据: []
    };
    for (const key2 in source) {
        const key = key2 as keyof ZixuanpeijianData;
        if (isEmpty(source[key])) {
            continue;
        }
        result[key] = source[key] as any;
    }
    for (const item of result.模块) {
        for (const cad of item.cads) {
            cad.data = new CadData(cad.data);
            if (cad.displayedData) {
                cad.displayedData = new CadData(cad.displayedData);
            }
        }
        if (item.可替换模块) {
            item.可替换模块 = importZixuanpeijian({模块: item.可替换模块}).模块;
        }
    }
    for (const item of result.零散) {
        item.data = new CadData(item.data);
        if (item.displayedData) {
            item.displayedData = new CadData(item.displayedData);
        }
    }
    result.备注 = result.备注.map((v) => new CadMtext(v));
    return result;
};

export const exportZixuanpeijian = (source: ZixuanpeijianData) => {
    const result: ObjectOf<any> = {};
    const getCadItem = (item: ZixuanpeijianCadItem) => ({
        ...item,
        data: item.data.export(),
        displayedData: item.displayedData?.export()
    });
    for (const key2 in source) {
        const key = key2 as keyof ZixuanpeijianData;
        if (isEmpty(source[key])) {
            continue;
        }
        if (key === "模块") {
            result[key] = source[key]?.map((item) => {
                const item2 = {
                    ...item,
                    cads: item.cads.map(getCadItem)
                };
                if (item.可替换模块) {
                    item2.可替换模块 = exportZixuanpeijian({模块: item.可替换模块}).模块;
                }
                return item2;
            });
        } else if (key === "零散") {
            result[key] = source[key]?.map(getCadItem);
        } else if (key === "备注") {
            result[key] = source[key]?.map((v) => v.export());
        } else {
            result[key] = source[key];
        }
    }
    return result;
};
