import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {ObjectOf} from "@utils";

export interface XhmrmsbjData extends TableDataBase {
  peizhishuju?: string;
}

export const menshanKeys = ["锁扇正面", "锁扇背面", "铰扇正面", "铰扇背面", "小扇正面", "小扇背面"] as const;

export class XhmrmsbjInfo {
  vid: number;
  name: string;
  menshanbujuInfos: ObjectOf<{选中布局?: number; 选中模块?: ObjectOf<number>}>;

  constructor(data: XhmrmsbjData) {
    this.vid = data.vid;
    this.name = data.mingzi;
    let info: any = null;
    this.menshanbujuInfos = {};
    try {
      info = JSON.parse(data.peizhishuju || "");
    } catch (error) {}
    if (!info || typeof info !== "object") {
      info = {};
    }
    for (const key of menshanKeys) {
      this.menshanbujuInfos[key] = info[key] || {};
    }
  }
}
