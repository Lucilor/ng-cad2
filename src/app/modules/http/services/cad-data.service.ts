import {Injectable, Injector} from "@angular/core";
import {CadCollection} from "@app/app.common";
import {CadData} from "@cad-viewer";
import {ObjectOf} from "@utils";
import {environment} from "src/environments/environment";
import {HttpService} from "./http.service";

export interface GetCadParams {
    collection: CadCollection;
    id: string;
    ids: string[];
    page: number;
    limit: number;
    search: ObjectOf<any>;
    qiliao: boolean;
    options: CadData["options"];
    optionsMatchType: "and" | "or";
}

export interface SetCadParams {
    collection: CadCollection;
    cadData: CadData;
    force: boolean;
    restore?: boolean;
}

export type CadSearchData = {
    title: string;
    items: {
        value: string;
        label: string;
        options: {value: string; label: string}[];
    }[];
}[];

export interface BancaiList {
    mingzi: string;
    cailiaoList: string[];
    houduList: number[];
    guigeList: number[][];
}
export interface BancaiCad {
    id: string;
    name: string;
    width: number;
    height: number;
    bancai: {mingzi: string; cailiao: string | null; houdu: number | null; guige: number[] | null; gas?: string};
}

export type Changelog = {
    timeStamp: number;
    content: {type: string; items: string[]}[];
}[];

@Injectable({
    providedIn: "root"
})
export class CadDataService extends HttpService {
    constructor(injector: Injector) {
        super(injector);
    }

    async getCad(params: Partial<GetCadParams>) {
        const response = await this.post<any[]>("peijian/cad/getCad", params);
        const result: {cads: CadData[]; total: number} = {cads: [], total: 0};
        if (response && response.data) {
            response.data.forEach((d) => result.cads.push(new CadData(d)));
            result.total = response.count || 0;
        }
        return result;
    }

    async setCad(params: SetCadParams): Promise<CadData | null> {
        const data = {...params, cadData: params.cadData.export()};
        const response = await this.post<any>("peijian/cad/setCad", data, "no");
        if (response && response.data) {
            const resData = response.data;
            const missingCads: CadData[] | undefined = resData.missingCads;
            if (missingCads) {
                const names = missingCads.map((v) => v.name).join(", ");
                const yes = await this.message.confirm({
                    content: "CAD模块中不存在以下数据，你可以选择生成这些CAD，或从模板中删除这些CAD。<br>" + names,
                    cancelable: false,
                    btnTexts: {yes: "生成CAD", no: "删除CAD"}
                });
                return await this.setCad({...params, restore: !!yes});
            } else {
                return new CadData(resData);
            }
        } else {
            return null;
        }
    }

    async getYuanshicadwenjian(params: Partial<GetCadParams>) {
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
        const result = await this.post<any>("peijian/cad/downloadDxf", {cadData: JSON.stringify(data.export())}, "no");
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
        const response = await this.post<any>(
            "peijian/cad/replaceCad",

            {
                source: JSON.stringify(source.export()),
                target,
                collection
            },
            "no"
        );
        if (response) {
            return new CadData(response.data);
        }
        return null;
    }

    async getOptions(
        name: string,
        search: string,
        page: number = 1,
        limit: number = 10,
        data?: CadData,
        xinghao?: string
    ): Promise<{data: {name: string; img: string}[]; count: number}> {
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
        if (response) {
            return {
                data: response.data.map((v: any) => ({name: v.mingzi, img: `${origin}/filepath/${v.xiaotu}`})),
                count: response.count || 0
            };
        }
        return {data: [], count: 0};
    }

    async getBackupCads(name = "", limit = 20) {
        const response = await this.post("peijian/cad/getBackupCads", {name, limit});
        if (response) {
            const result = response.data as {time: number; data: CadData}[];
            result.forEach((v) => {
                v.data = new CadData(v.data);
            });
            return result;
        }
        return null;
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
        const response = await this.post<{bancaiList: BancaiList[]; bancaiCads: BancaiCad[]}>("order/order/getBancais", {table, codes});
        if (response?.data) {
            return response.data;
        }
        return null;
    }

    async getChangelog(page?: number, pageSize?: number) {
        const response = await this.post<Changelog>("ngcad/getChangelog", {page, pageSize}, "no");
        if (response?.data) {
            return {changelog: response.data, count: response.count || 0};
        } else {
            return {changelog: [], count: 0};
        }
    }

    async setChangelogItem(changelogItem: Changelog[0], index: number) {
        const response = await this.post("ngcad/setChangelogItem", {changelogItem, index}, "no");
        return response && response.code === 0;
    }

    async addChangelogItem(changelogItem: Changelog[0], index: number) {
        const response = await this.post("ngcad/addChangelogItem", {changelogItem, index}, "no");
        return response && response.code === 0;
    }

    async removeChangelogItem(index: number) {
        const response = await this.post("ngcad/removeChangelogItem", {index}, "no");
        return response && response.code === 0;
    }
}
