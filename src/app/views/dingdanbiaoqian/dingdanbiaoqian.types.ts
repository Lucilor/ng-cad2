import {SafeUrl} from "@angular/platform-browser";
import {CadData} from "@cad-viewer";
import {Formulas} from "@src/app/utils/calc";
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
        calcW: number;
        calcH: number;
        style: Properties;
        imgStyle: Properties;
    }[];
    positions: number[][];
    style: Properties;
    info: ObjectOf<string | number>[] | null;
    质检标签?: ZhijianForm;
    mokuaiIndex?: number;
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
