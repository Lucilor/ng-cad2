import {Injectable, Injector} from "@angular/core";
import {CadCollection} from "@src/app/app.common";
import {CadData} from "@src/app/cad-viewer";
import {ObjectOf} from "@src/app/utils";
import {environment} from "@src/environments/environment";
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
    bancai: {mingzi: string; cailiao: string | null; houdu: number | null; guige: number[] | null};
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

    async setCad(params: SetCadParams) {
        const data = {...params, cadData: JSON.stringify(params.cadData.export())};
        const response = await this.post<CadData>("peijian/cad/setCad", data, false);
        if (response && response.data) {
            return new CadData(response.data);
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
        const result = await this.post<any>("peijian/cad/downloadDxf", {cadData: JSON.stringify(data.export())}, false);
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
            false
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
        data?: CadData
    ): Promise<{data: {name: string; img: string}[]; count: number}> {
        const postData: ObjectOf<any> = {
            name,
            search,
            page,
            limit
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

    async getBackupCads(search = "", limit = 20) {
        const response = await this.post("peijian/cad/getBackupCads", {search, limit});
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

    async jiguangkailiaopaiban(codes: string[], bancaiCads: BancaiCad[], table: string, autoGuige: boolean) {
        const response = await this.post<string>("order/order/jiguangkailiaopaiban", {codes, bancaiCads, table, autoGuige});
        if (response?.data) {
            return response.data;
        }
        return null;
    }

    async getChangelog(page?: number, pageSize?: number) {
        const response = await this.get<Changelog>("ngcad/getChangelog", {page, pageSize}, false);
        if (response?.data) {
            return {changelog: response.data, count: response.count};
        } else {
            return {changelog: [], count: 0};
        }
    }

    async setChangelog(changelog: Changelog) {
        const response = await this.post("ngcad/setChangelog", {changelog}, false);
        return response && response.code === 0;
    }
}
