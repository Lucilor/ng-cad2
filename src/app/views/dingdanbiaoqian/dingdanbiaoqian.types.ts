import {SafeUrl} from "@angular/platform-browser";
import {Formulas} from "@app/utils/calc";
import {CadData} from "@cad-viewer";
import {FormulaInfo} from "@components/formulas/formulas.component";
import {ObjectOf} from "@utils";
import {Properties} from "csstype";

export interface Order {
  code: string;
  开启锁向示意图?: {data: CadData; img: SafeUrl; style: Properties};
  配合框?: {data: CadData; img: SafeUrl; style: Properties}[];
  materialResult?: Formulas;
  cads: {
    data: CadData;
    isLarge: boolean;
    img: SafeUrl;
    imgLarge?: SafeUrl;
    imgSize: [number, number];
    style: Properties;
    imgStyle: Properties;
    zhankai?: {width: string; height: string; num?: string}[];
  }[];
  positions: number[][];
  style: Properties;
  info: ObjectOf<string | number>[] | null;
  质检标签?: ZhijianForm;
  mokuaiInfo?: {
    index: number;
    details: {title?: string; value: string}[];
    formulaInfos: FormulaInfo[];
  };
}

export interface SectionCell {
  key: string;
  label?: string;
  isBoolean?: boolean;
  class?: string | string[];
  style?: Properties;
}

export interface SectionConfig {
  rows: {
    cells: SectionCell[];
  }[];
}

export type DdbqData = {
  code: string;
  materialResult: Formulas;
  cads: ObjectOf<any>[];
  流程单数据: ObjectOf<string>;
  开启锁向示意图: ObjectOf<any>;
  配合框: ObjectOf<any>[];
  质检标签?: ZhijianForm;
}[];

export interface ZhijianForm {
  title: string;
  barCode: string;
  items: ZhijianFormItem[];
}

export interface ZhijianFormItem {
  label: string;
  value: string;
  style?: Properties;
  labelStyle?: Properties;
  valueStyle?: Properties;
}
