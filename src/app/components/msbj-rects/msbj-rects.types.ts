import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {Formulas} from "@src/app/utils/calc";
import {Rectangle} from "@utils";
import {uniqueId} from "lodash";

export interface MsbjRectInfoRaw extends TableDataBase {
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
