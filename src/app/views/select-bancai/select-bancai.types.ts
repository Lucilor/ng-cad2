import {BancaiCad, BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";

export const houduPattern = /^\d+([.]{1}\d+){0,1}$/;
export const guigePattern = /^(\d+([.]{1}\d+){0,1})[^\d^.]+(\d+([.]{1}\d+){0,1})$/;

export interface BancaiCadExtend extends BancaiCad {
  checked: boolean;
  oversized: boolean;
  disabled: boolean;
}

export interface SelectBancaiDlHistory {
  name: string;
  date: string;
}

export interface BancaisInfo {
  bancaiList: BancaiList[];
  downloadName: string;
  orderBancais: {
    code: string;
    name: string;
    huohao: string;
    bancaiCads: BancaiCad[];
    errors: {code: string; msg: string}[];
    上下走线: string;
    开料孔位配置: string;
    开料参数: string;
  }[];
}

export interface OrderBancaiInfo {
  code: string;
  shangxiazouxianUrl: string;
  kailiaokongweipeizhiUrl: string;
  kailiaocanshuzhiUrl: string;
  sortedCads: BancaiCadExtend[][];
  bancaiInfos: {
    cads: string[];
    oversized: boolean;
    inputInfos: InputInfo[];
  }[];
}
