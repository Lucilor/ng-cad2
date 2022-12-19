import {Injectable, Injector} from "@angular/core";
import {CadCollection} from "@app/app.common";
import {CadData} from "@cad-viewer";
import {dataURLtoBlob, downloadByUrl, DownloadOptions, ObjectOf} from "@utils";
import {
  GetCadParams,
  SetCadParams,
  CadSearchData,
  GetOptionsParams,
  OptionsData,
  BancaiList,
  BancaiCad,
  Changelog,
  QueryMongodbParams,
  QueryMysqlParams,
  TableUpdateParams,
  TableDataBase
} from "./cad-data.service.types";
import {CadImgCache} from "./cad-img-cache";
import {CustomResponse, HttpOptions, HttpService} from "./http.service";

@Injectable({
  providedIn: "root"
})
export class CadDataService extends HttpService {
  public cadImgCache = new CadImgCache();

  constructor(injector: Injector) {
    super(injector);
  }

  private async _resolveMissingCads(response: CustomResponse<any>) {
    const missingCads: CadData[] = response.data?.missingCads;
    if (missingCads) {
      const names = missingCads.map((v) => v.name).join(", ");
      const toHide = document.querySelectorAll<HTMLElement>(".ngx-overlay.loading-foreground");
      toHide.forEach((el) => {
        el.classList.add("hidden");
      });
      const yes = await this.message.confirm({
        content: "CAD模块中不存在以下数据，你可以选择生成这些CAD，或从模板中删除这些CAD。<br>" + names,
        disableCancel: true,
        btnTexts: {yes: "生成CAD", no: "删除CAD"}
      });
      toHide.forEach((el) => {
        el.classList.remove("hidden");
      });
      return !!yes;
    }
    return null;
  }

  async getCad(params: GetCadParams): Promise<{cads: CadData[]; total: number}> {
    const response = await this.post<any>("peijian/cad/getCad", params, {bypassCodes: [10]});
    const result: {cads: CadData[]; total: number} = {cads: [], total: 0};
    if (response && response.data) {
      if (response.code === 10) {
        const data = new CadData(response.data.cad);
        data.info.isOnline = true;
        result.cads = [data];
      } else {
        const restore = await this._resolveMissingCads(response);
        if (typeof restore === "boolean") {
          return await this.getCad({...params, restore});
        } else {
          result.cads = response.data.map((v: any) => {
            const v2 = new CadData(v);
            v2.info.isOnline = true;
            return v2;
          });
          result.total = response.count || 0;
        }
      }
    }
    return result;
  }

  async setCad(params: SetCadParams, options?: HttpOptions): Promise<CadData | null> {
    const cadData = params.cadData instanceof CadData ? params.cadData.export() : params.cadData;
    const data = {...params, cadData};
    const response = await this.post<any>("peijian/cad/setCad", data, options);
    if (response && response.data) {
      const resData = response.data;
      const restore = await this._resolveMissingCads(response);
      if (typeof restore === "boolean") {
        if (params.collection === "CADmuban") {
          params.cadData.components.data.forEach((v) => {
            const entities = v.entities;
            entities.image = entities.image.filter((e) => !e.info.convertCadToImage);
          });
        }
        return await this.setCad({...params, restore}, options);
      } else {
        this.cadImgCache.remove(resData.id);
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

  async downloadDxf(data: CadData, downloadOptions?: DownloadOptions) {
    const result = await this.post<any>("peijian/cad/downloadDxf", {cadData: JSON.stringify(data.export())});
    if (result) {
      try {
        downloadByUrl(origin + "/" + result.data.path, downloadOptions);
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
    return false;
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

  async getOptions(params: GetOptionsParams): Promise<OptionsData> {
    const postData: ObjectOf<any> = {...params};
    if (params.data) {
      delete postData.data;
      const exportData = params.data.export();
      postData.mingzi = exportData.name;
      postData.fenlei = exportData.type;
      postData.xuanxiang = exportData.options;
      postData.tiaojian = exportData.conditions;
    }
    const response = await this.post<any>("peijian/cad/getOptions", postData);
    if (response && response.data) {
      return {
        data: (response.data as any[]).map((v: any) => {
          const img = v.xiaotu ? `${origin}/filepath/${v.xiaotu}` : null;
          return {name: v.mingzi, img, disabled: !!v.tingyong};
        }),
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

  async removeCads(collection: CadCollection, ids: string[], options?: HttpOptions) {
    const response = await this.post<string[]>("peijian/cad/removeCad", {collection, ids}, options);
    if (response?.data) {
      return response.data;
    }
    return null;
  }

  async getBancais(table: string, codes: string[]) {
    const response = await this.post<{
      bancaiList: BancaiList[];
      bancaiCads: BancaiCad[];
      errors: {code: string; msg: string}[];
      downloadName: string;
      上下走线: string;
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

  async queryMongodb<T extends ObjectOf<any>>(params: QueryMongodbParams, options?: HttpOptions) {
    const response = await this.post<T[]>("ngcad/queryMongodb", params, options);
    return response?.data ?? [];
  }

  async queryMySql<T extends TableDataBase>(params: QueryMysqlParams, options?: HttpOptions) {
    params = {page: 1, limit: 10, ...params};
    const response = await this.post<T[]>("ngcad/queryMysql", params, {testData: params.table, ...options});
    return response?.data ?? [];
  }

  async getCadImg(id: string, useCache = true, options?: HttpOptions) {
    if (useCache) {
      const url = this.cadImgCache.get(id);
      if (url) {
        return url;
      }
    }
    const response = await this.post<{url: string | null}>("ngcad/getCadImg", {id}, options);
    return response?.data?.url || null;
  }

  async setCadImg(id: string, dataURL: string, options?: HttpOptions) {
    const blob = dataURLtoBlob(dataURL);
    const file = new File([blob], `${id}.png`);
    await this.post("ngcad/setCadImg", {id, file}, options);
  }

  async getShortUrl(name: string, data: ObjectOf<any> = {}, options?: HttpOptions) {
    const response = await this.post<string>("ngcad/getShortUrl", {name, data}, options);
    return response?.data || null;
  }

  async tableUpdate<T = any>(params: TableUpdateParams, options?: HttpOptions) {
    await this.post<T[]>("jichu/jichu/table_update", params, options);
  }
}
