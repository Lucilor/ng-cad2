import {CadData} from "@cad-viewer";
import {BancaiList, TableDataBase} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {XiaodaohangStructure} from "@src/app/app.common";
import {ObjectOf} from "@utils";

export interface MrbcjfzResponseData {
  xinghao: MrbcjfzXinghao;
  cads: any[];
  huajians: MrbcjfzHuajian[];
  qiliaos: TableDataBase[];
  bancaiKeys: string[];
  bancaiKeysNonClear: string[];
  bancaiKeysRequired: string[];
  bancaiList: BancaiList[];
  xiaodaohangStructure: XiaodaohangStructure;
}

export interface MrbcjfzXinghao extends TableDataBase {
  morenbancai?: string;
  gongshishuru?: string;
}

export interface MrbcjfzHuajian extends TableDataBase {
  xiaotu?: string;
  shihuajian?: number;
}

export class MrbcjfzXinghaoInfo {
  默认板材: ObjectOf<MrbcjfzInfo> = {};

  constructor(public raw: MrbcjfzXinghao) {
    try {
      this.默认板材 = JSON.parse(raw.morenbancai || "");
    } catch (error) {}
  }

  getBancaiTitle(key: string, placeholder = "") {
    const info = this.默认板材[key];
    if (!info) {
      return "";
    }
    const {默认开料板材, 默认开料材料, 默认开料板材厚度, 选中板材, 选中材料, 选中板材厚度} = info;
    const arr1 = [默认开料板材, 默认开料材料, 默认开料板材厚度].filter(Boolean);
    const arr2 = [选中板材, 选中材料, 选中板材厚度].filter(Boolean);
    if (arr2.length > 0) {
      return arr2.join("/");
    } else if (arr1.length > 0) {
      return arr1.join("/");
    }
    return placeholder;
  }
}

export interface MrbcjfzInfo {
  默认开料板材: string;
  默认开料材料: string;
  默认开料板材厚度: string;
  默认对应板材分组: string;
  选中板材: string;
  选中材料: string;
  选中板材厚度: string;
  选中板材分组: string;
  可选板材: string[];
  花件: string[];
  CAD: string[];
  企料: string[];
}

export const getMrbcjfzInfo = (source: Partial<MrbcjfzInfo> = {}): MrbcjfzInfo => ({
  默认开料板材: "",
  默认开料材料: "",
  默认开料板材厚度: "",
  默认对应板材分组: "",
  选中板材: "",
  选中材料: "",
  选中板材厚度: "",
  选中板材分组: "",
  可选板材: [],
  花件: [],
  CAD: [],
  企料: [],
  ...source
});

export interface MrbcjfzBancaiInputs {
  bancai: InputInfo<MrbcjfzInfo>;
  cailiao: InputInfo<MrbcjfzInfo>;
  houdu: InputInfo<MrbcjfzInfo>;
}

export interface MrbcjfzListItem {
  id: string;
  selected?: boolean;
  isVirtual?: boolean;
}

export const listItemKeys = ["CAD", "花件", "企料"] as const;
export type ListItemKey = (typeof listItemKeys)[number];

export interface MrbcjfzCadInfo extends MrbcjfzListItem {
  data: CadData;
  img: string;
}

export interface MrbcjfzHuajianInfo extends MrbcjfzListItem {
  data: MrbcjfzHuajian;
}

export interface MrbcjfzQiliaoInfo extends MrbcjfzListItem {
  data: TableDataBase;
}

export const filterCad = (info: MrbcjfzCadInfo) => {
  const data = info.data;
  if (data.gudingkailiaobancai || data.板材绑定选项) {
    return false;
  }
  const typeReg = /激光花|花件|示意图|装配示意图|特定企料|横截面示意图|纵截面示意图/;
  if (typeReg.test(data.type) || typeReg.test(data.type2)) {
    return false;
  }
  if (data.options.花件 || Object.keys(data.options).some((v2) => v2.includes("压条"))) {
    return false;
  }
  return true;
};

export const filterHuajian = (info: MrbcjfzHuajianInfo) => {
  const data = info.data;
  if (data.shihuajian) {
    return false;
  }
  const mingziReg = /压条|压边|门徽|猫眼|LOGO|商标|花件|木板|阴影|门铰|拉手/;
  if (mingziReg.test(data.mingzi)) {
    return false;
  }
  return true;
};

export const isMrbcjfzInfoEmpty = (info: MrbcjfzInfo) => {
  const {CAD, 花件, 企料} = info;
  return [CAD, 花件, 企料].every((v) => !v || v.length < 1);
};
