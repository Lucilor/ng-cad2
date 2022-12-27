import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {Formulas} from "@src/app/utils/calc";
import {Rectangle} from "@utils";
import {uniqueId} from "lodash";

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

export interface MsbjRectInfoRaw {
  vid: number;
  isBuju: boolean;
  rect: {
    origin: {
      x: number;
      y: number;
    };
    size: {
      w: number;
      h: number;
    };
  };
  mingzi?: string;
  可选模块分类?: number[];
  选中模块分类?: number[];
  选中模块?: number[];
  模块大小关系?: Formulas;
}

export class MsbjRectInfo {
  id: string;
  rect: Rectangle;
  bgColor?: string;

  constructor(public raw: MsbjRectInfoRaw) {
    this.id = uniqueId();
    const {x, y} = raw.rect.origin;
    const {w, h} = raw.rect.size;
    this.rect = new Rectangle([x, y], [x + w, y + h]);
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
