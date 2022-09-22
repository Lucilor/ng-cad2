import {SafeUrl} from "@angular/platform-browser";
import {CadViewerConfig, CadData} from "@cad-viewer";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf} from "@utils";

export interface ZixuanpeijianTypesInfoItem {
    id: string;
    xiaoguotu: string;
    jiemiantu: string;
    gongshishuru: string[][];
    xuanxiangshuru: string[][];
    suanliaogongshi: Formulas;
    shuchubianliang: string[];
    xinghaozhuanyong: string[];
    mokuaishuoming: string;
}
export type ZixuanpeijianTypesInfo = ObjectOf<ObjectOf<ZixuanpeijianTypesInfoItem>>;

export interface ZixuanpeijianInputsInfoItem {
    totalWidth: InputInfo;
    totalHeight: InputInfo;
    gongshishuru: InputInfo[][];
}
export type ZixuanpeijianInputsInfos = ObjectOf<ObjectOf<ZixuanpeijianInputsInfoItem>>;

export interface ZixuanpeijianInput {
    step: number;
    data?: ZixuanpeijianOutput;
    checkEmpty?: boolean;
    cadConfig?: Partial<CadViewerConfig>;
    materialResult?: Formulas;
    dropDownKeys: string[];
}

export interface ZixuanpeijianInfo {
    houtaiId: string;
    zhankai: {width: string; height: string; num: string; originalWidth: string; cadZhankaiIndex?: number; custom?: boolean}[];
    calcZhankai?: any[];
    bancai?: BancaiList & {cailiao?: string; houdu?: string};
    translate?: [number, number];
    hidden?: boolean;
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
}

export type ZixuanpeijianOutput = {模块: ZixuanpeijianMokuaiItem[]; 零散: ZixuanpeijianCadItem[]};

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
    cads: CadItemInputInfo[];
}

export interface ZixuanpeijianlingsanCadItem {
    data: CadData;
    img: SafeUrl;
    hidden: boolean;
}