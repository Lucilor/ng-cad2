import {Injectable, Injector} from "@angular/core";
import {CadCollection} from "@app/app.common";
import {CadData} from "@cad-viewer";
import {environment} from "@env";
import {ObjectOf} from "@utils";
import {CustomResponse, HttpService} from "./http.service";

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

export interface OptionsData {
    data: {name: string; img: string}[];
    count: number;
}

export interface BancaiList {
    mingzi: string;
    cailiaoList: string[];
    houduList: string[];
    guigeList: number[][];
}
export interface BancaiCad {
    id: string;
    name: string;
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

@Injectable({
    providedIn: "root"
})
export class CadDataService extends HttpService {
    constructor(injector: Injector) {
        super(injector);
    }

    private async _resolveMissingCads(response: CustomResponse<any>) {
        const missingCads: CadData[] = response.data?.missingCads;
        if (missingCads) {
            const names = missingCads.map((v) => v.name).join(", ");
            const yes = await this.message.confirm({
                content: "CAD模块中不存在以下数据，你可以选择生成这些CAD，或从模板中删除这些CAD。<br>" + names,
                cancelable: false,
                btnTexts: {yes: "生成CAD", no: "删除CAD"}
            });
            return !!yes;
        }
        return null;
    }

    async getCad(params: GetCadParams): Promise<{cads: CadData[]; total: number}> {
        const response = await this.post<any[]>("peijian/cad/getCad", params);
        const result: {cads: CadData[]; total: number} = {cads: [], total: 0};
        if (response && response.data) {
            const restore = await this._resolveMissingCads(response);
            if (typeof restore === "boolean") {
                return await this.getCad({...params, restore});
            } else {
                result.cads = response.data.map((v) => new CadData(v));
                result.total = response.count || 0;
            }
        }
        return result;
    }

    async setCad(params: SetCadParams): Promise<CadData | null> {
        const cadData = params.cadData instanceof CadData ? params.cadData.export() : params.cadData;
        const data = {...params, cadData};
        const response = await this.post<any>("peijian/cad/setCad", data);
        if (response && response.data) {
            const resData = response.data;
            const restore = await this._resolveMissingCads(response);
            if (typeof restore === "boolean") {
                return await this.setCad({...params, restore});
            } else {
                return new CadData(resData);
            }
        } else {
            return null;
        }
    }

    async getYuanshicadwenjian(params: GetCadParams) {
        const response = await this.post<any[]>("peijian/cad/getYuanshicadwenjian", params);
        const result: {cads: any[]; total: number} = {cads: [], total: 0};
        if (response && response.data) {
            result.cads = response.data;
            result.total = response.count || 0;
        }
        return result;
    }

    async getCadSearchForm() {
        const response = await this.get("peijian/cad/getSearchForm");
        if (response) {
            return response.data as CadSearchData;
        }
        return [];
    }

    async getCadSearchOptions(table: string) {
        const response = await this.post("peijian/cad/getSearchOptions", {table});
        if (response) {
            return response.data as CadSearchData[0]["items"][0];
        }
        return null;
    }

    async downloadDxf(data: CadData) {
        const result = await this.post<any>("peijian/cad/downloadDxf", {cadData: JSON.stringify(data.export())});
        const host = environment.production ? origin : "//localhost";
        if (result) {
            open(host + "/" + result.data.path);
        }
    }

    async uploadDxf(dxf: File) {
        const response = await this.post<any>("peijian/cad/uploadDxf", {dxf});
        if (response) {
            return new CadData(response.data);
        }
        return null;
    }

    async replaceData(source: CadData, target: string, collection: CadCollection) {
        source.sortComponents();
        const response = await this.post<any>("peijian/cad/replaceCad", {
            source: JSON.stringify(source.export()),
            target,
            collection
        });
        if (response) {
            return new CadData(response.data);
        }
        return null;
    }

    async getOptions(name: string, search: string, page?: number, limit?: number, data?: CadData, xinghao?: string): Promise<OptionsData> {
        const postData: ObjectOf<any> = {
            name,
            search,
            page,
            limit,
            xinghao
        };
        if (data) {
            const exportData = data.export();
            postData.mingzi = exportData.name;
            postData.fenlei = exportData.type;
            postData.xuanxiang = exportData.options;
            postData.tiaojian = exportData.conditions;
        }
        const response = await this.post<any>("peijian/cad/getOptions", postData);
        if (response && response.data) {
            return {
                data: (response.data as any[]).map((v: any) => ({name: v.mingzi, img: `${origin}/filepath/${v.xiaotu}`})),
                count: response.count || 0
            };
        }
        return {data: [], count: 0};
    }

    async removeBackup(name: string, time: number) {
        const response = await this.post("peijian/cad/removeBackup", {name, time});
        return response ? true : false;
    }

    async getSuanliaodan(codes: string[]) {
        const response = await this.post<any[]>("order/order/suanliaodan", {codes});
        if (response?.data) {
            const data: CadData[] = response.data.map((v) => new CadData(v));
            return data;
        } else {
            return [];
        }
    }

    async removeCads(collection: string, ids: string[]) {
        await this.post<never>("peijian/cad/removeCad", {collection, ids});
    }

    async getBancais(table: string, codes: string[]) {
        const response = await this.post<{
            bancaiList: BancaiList[];
            bancaiCads: BancaiCad[];
            开料孔位配置: string;
            开料参数: string;
        }>("order/order/getBancais", {table, codes});
        if (response?.data) {
            return response.data;
        }
        return null;
    }

    async getChangelog(page?: number, pageSize?: number) {
        const response = await this.post<Changelog>("ngcad/getChangelog", {page, pageSize});
        if (response?.data) {
            return {changelog: response.data, count: response.count || 0};
        } else {
            return {changelog: [], count: 0};
        }
    }

    async setChangelogItem(changelogItem: Changelog[0], index: number) {
        const response = await this.post("ngcad/setChangelogItem", {changelogItem, index});
        return response && response.code === 0;
    }

    async addChangelogItem(changelogItem: Changelog[0], index: number) {
        const response = await this.post("ngcad/addChangelogItem", {changelogItem, index});
        return response && response.code === 0;
    }

    async removeChangelogItem(index: number) {
        const response = await this.post("ngcad/removeChangelogItem", {index});
        return response && response.code === 0;
    }

    async queryMongodb<T extends ObjectOf<any>>(params: QueryMongodbParams) {
        const response = await this.post<T[]>("ngcad/queryMongodb", params);
        return response?.data ?? [];
    }

    async queryMySql<T extends ObjectOf<any>>(params: QueryMysqlParams) {
        const response = await this.post<T[]>("ngcad/queryMysql", params);
        return response?.data ?? [];
    }
}
