import {ObjectOf, Rectangle} from "@utils";
import {uniqueId} from "lodash";

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
  可选模块分类?: number[];
  选中模块分类?: number[];
  选中模块?: number;
}

export interface MsbjPeizhishuju {
  模块节点: MsbjRectInfoRaw[];
  模块大小关系?: ObjectOf<any>;
}

export class MsbjRectInfo {
  id: string;
  name: string;
  rect: Rectangle;
  bgColor?: string;

  constructor(public raw: MsbjRectInfoRaw) {
    this.id = uniqueId();
    this.name = "";
    const {x, y} = raw.rect.origin;
    const {w, h} = raw.rect.size;
    this.rect = new Rectangle([x, y], [x + w, y + h]);
  }
}
