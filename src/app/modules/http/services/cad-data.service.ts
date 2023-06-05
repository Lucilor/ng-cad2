import {Injectable, Injector} from "@angular/core";
import {getFilepathUrl} from "@app/app.common";
import {CadCollection} from "@app/cad/collections";
import {CadData} from "@cad-viewer";
import {dataURLtoBlob, downloadByUrl, DownloadOptions, ObjectOf} from "@utils";
import {
  BancaiCad,
  BancaiList,
  BancaiListData,
  CadSearchData,
  Changelog,
  GetCadParams,
  GetOptionsParams,
  OptionsData,
  QueryMongodbParams,
  QueryMysqlParams,
  SetCadParams,
  TableDataBase,
  TableDeleteParams,
  TableInsertParams,
  TableRenderData,
  TableUpdateParams,
  TableUploadFile
} from "./cad-data.service.types";
import {CadImgCache} from "./cad-img-cache";
import {HttpService} from "./http.service";
import {CustomResponse, HttpOptions} from "./http.service.types";

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
      const button = await this.message.button({
        content: "CAD模块中不存在以下数据，你可以选择生成这些CAD，或从模板中删除这些CAD。<br>" + names,
        disableCancel: true,
        buttons: ["生成CAD", "删除CAD"]
      });
      toHide.forEach((el) => {
        el.classList.remove("hidden");
      });
      return button === "生成CAD";
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
    if (params.data instanceof CadData) {
      delete postData.data;
      const exportData = params.data.export();
      postData.mingzi = exportData.name;
      postData.fenlei = exportData.type;
      postData.xuanxiang = exportData.options;
      postData.tiaojian = exportData.conditions;
    }
    const response = await this.post<any>("ngcad/getOptions", postData);
    if (response && response.data) {
      return {
        data: (response.data as any[]).map((v: any) => {
          const img = getFilepathUrl(v.xiaotu) || null;
          return {vid: v.vid, name: v.mingzi, img, disabled: !!v.tingyong};
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
    return (this.getResponseData(response) || []).map((v) => new CadData(v));
  }

  async removeCads(collection: CadCollection, ids: string[], options?: HttpOptions) {
    const response = await this.post<string[]>("peijian/cad/removeCad", {collection, ids}, options);
    return this.getResponseData(response);
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
    return this.getResponseData(response);
  }

  async getChangelog(page?: number, pageSize?: number) {
    const response = await this.post<Changelog>("ngcad/getChangelog", {page, pageSize});
    return {changelog: this.getResponseData(response) || [], count: response?.count || 0};
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
    return this.getResponseData(response) || [];
  }

  async queryMySql<T extends TableDataBase>(params: QueryMysqlParams, options?: HttpOptions) {
    const response = await this.post<T[]>("ngcad/queryMysql", params, {testData: params.table, ...options});
    return this.getResponseData(response) || [];
  }

  async getCadImg(id: string, useCache = true, options?: HttpOptions) {
    if (useCache) {
      const url = this.cadImgCache.get(id);
      if (url) {
        return url;
      }
    }
    const response = await this.post<{url: string | null}>("ngcad/getCadImg", {id}, options);
    return this.getResponseData(response)?.url || null;
  }

  async setCadImg(id: string, dataURL: string, options?: HttpOptions) {
    const blob = dataURLtoBlob(dataURL);
    const file = new File([blob], `${id}.png`);
    await this.post("ngcad/setCadImg", {id, file}, options);
  }

  async getShortUrl(name: string, data: ObjectOf<any> = {}, options?: HttpOptions) {
    const response = await this.post<string>("ngcad/getShortUrl", {name, data}, options);
    return this.getResponseData(response);
  }

  async tableInsert<T extends TableDataBase = TableDataBase>(params: TableInsertParams<T>, options?: HttpOptions) {
    const response = await this.post<void>("jichu/jichu/table_insert", params, options);
    return response?.code === 0;
  }

  async tableUpdate<T extends TableDataBase = TableDataBase>(params: TableUpdateParams<T>, options?: HttpOptions) {
    const data = params.data;
    const getParams2 = (params1: TableUpdateParams<T>) => {
      const params2: ObjectOf<any> = {...params1};
      params2.tableData = params2.data;
      delete params2.data;
      return params2;
    };
    if (Object.keys(data).length > 1) {
      const fields = Object.keys(data).filter((v) => v !== "vid");
      const results = await Promise.all(
        fields.map(async (field) => {
          const data2 = {vid: data.vid, [field]: (data as any)[field]} as any;
          const params2 = getParams2({...params, data: data2});
          const response = await this.post<void>("jichu/jichu/table_update", params2, options);
          return response?.code === 0;
        })
      );
      return results.every(Boolean);
    } else {
      const params2 = getParams2(params);
      const response = await this.post<void>("jichu/jichu/table_update", params2, options);
      return response?.code === 0;
    }
  }

  async tableDelete(params: TableDeleteParams, options?: HttpOptions) {
    const response = await this.post<void>("jichu/jichu/table_delete", params, options);
    return response?.code === 0;
  }

  async tableUploadFile<T extends TableDataBase = TableDataBase>(params: TableUploadFile<T>, options?: HttpOptions) {
    const response = await this.post<void>("jichu/jichu/upload_file", params, options);
    return response?.code === 0;
  }

  async getRedisData(key: string, isString = true, options?: HttpOptions) {
    const response = await this.post<{value: any}>("ngcad/getRedisData", {key, isString}, options);
    return this.getResponseData(response)?.value;
  }

  async setRedisData(value: any, key?: string, expireTime?: number, options?: HttpOptions) {
    await this.post<{key: string; expireTime: number}>("ngcad/setRedisData", {key, value, expireTime}, options);
  }

  async getBancaiList() {
    const response = await this.post<BancaiListData>("ngcad/getBancaiList");
    return this.getResponseData(response);
  }

  async getTableRenderData(table: string) {
    const response = await this.post<TableRenderData>("ngcad/getTableData", {table});
    return this.getResponseData(response);
  }
}
