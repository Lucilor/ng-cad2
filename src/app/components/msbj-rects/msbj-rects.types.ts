import {ObjectOf, Rectangle} from "@lucilor/utils";
import {uniqueId} from "lodash";

export interface MsbjRectInfoRaw {
  vid: number;
  name?: string;
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
}

export interface MsbjPeizhishuju {
  模块节点: MsbjRectInfoRaw[];
  模块大小关系?: GongshiObj;
}

export type GongshiObj = ObjectOf<any>;

export class MsbjRectInfo {
  id: string;
  rect: Rectangle;
  bgColor?: string;

  get name() {
    return this.raw.name || "";
  }
  set name(value) {
    this.raw.name = value;
  }

  constructor(public raw: MsbjRectInfoRaw) {
    this.id = uniqueId();
    const {x, y} = raw.rect.origin;
    const {w, h} = raw.rect.size;
    this.rect = new Rectangle([x, y], [x + w, y + h]);
  }
}
