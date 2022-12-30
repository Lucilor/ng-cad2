import {MsbjRectInfoRaw} from "@components/msbj-rects/msbj-rects.types";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";

export class MsbjInfo {
  vid: number;
  name: string;
  menshanbuju?: string;
  rectInfos: MsbjRectInfoRaw[];

  constructor(data: MsbjData, dataField: keyof MsbjData, fenleis?: TableDataBase[]) {
    this.vid = data.vid;
    this.name = data.mingzi;
    this.menshanbuju = data.menshanbuju;
    this.rectInfos = [];

    let rectInfos1: MsbjRectInfoRaw[] | null = null;
    try {
      rectInfos1 = window.node2rect(JSON.parse(data.node || ""));
    } catch (error) {}
    let rectInfos2: MsbjRectInfoRaw[] | null = null;
    try {
      rectInfos2 = JSON.parse(data[dataField] as any);
    } catch (error) {}
    if (rectInfos1) {
      for (const info1 of rectInfos1) {
        if (fenleis) {
          info1.可选模块分类 = fenleis.map((v) => v.vid);
        }
        const info2 = rectInfos2?.find((v) => v.vid === info1.vid);
        if (info2) {
          Object.assign(info1, info2);
        }
      }
      this.rectInfos = rectInfos1.map((v) => ({...v, selected: false}));
    }
  }
}

export interface MsbjFenlei extends TableDataBase {
  selected?: boolean;
}

export interface MsbjData extends TableDataBase {
  peizhishuju?: string;
  menshanbuju?: string;
  menshanbujumorenfenlei?: string;
  node?: string;
}
