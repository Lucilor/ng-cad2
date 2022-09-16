import {CadData} from "@cad-viewer";
import {CadCollection} from "@src/app/app.common";
import {ObjectOf} from "@utils";

export interface GetCadParams {
    collection: CadCollection;
    id?: string;
    ids?: string[];
    page?: number;
    limit?: number;
    search?: ObjectOf<any>;
    qiliao?: boolean;
    options?: CadData["options"];
    optionsMatchType?: "and" | "or";
    sync?: boolean;
    restore?: boolean;
}

export interface SetCadParams {
    collection: CadCollection;
    cadData: CadData;
    force?: boolean;
    restore?: boolean;
    importConfig?: {pruneLines: boolean};
}

export type CadSearchData = {
    title: string;
    items: {
        value: string;
        label: string;
        options: {value: string; label: string}[];
    }[];
}[];

export interface GetOptionsParams {
    name: string;
    search?: string;
    page?: number;
    limit?: number;
    data?: CadData;
    xinghao?: string;
    includeTingyong?: boolean;
    values?: string[];
}

export interface OptionsData {
    data: {name: string; img: string | null; disabled: boolean}[];
    count: number;
}

export interface BancaiList {
    mingzi: string;
    cailiaoList: string[];
    houduList: string[];
    guigeList: number[][];
    zidingyi?: string;
}
export interface BancaiCad {
    id: string;
    name: string;
    peihe?: string;
    width: number;
    height: number;
    bancai: {mingzi: string; cailiao: string | null; houdu: string | null; guige: number[] | null; gas?: string};
}

export type Changelog = {
    timeStamp: number;
    content: {type: string; items: string[]}[];
}[];

export interface QueryMongodbParams {
    collection: CadCollection;
    where?: ObjectOf<any>;
    fields?: string[];
    limit?: number;
    skip?: number;
    genUnqiCode?: boolean;
}

export interface QueryMysqlParams {
    table: string;
    filter?: ObjectOf<any>;
    fields?: string[];
    page?: number;
    limit?: number;
}

export interface TableSelectParams {
    xiaodaohang: string;
    page?: number;
    limit?: number;
    search?: ObjectOf<any>;
}
