import {updateMokuaiItems, ZixuanpeijianMokuaiItem, ZixuanpeijianTypesInfo} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf} from "@utils";

export interface XhmrmsbjTableData extends TableDataBase {
  peizhishuju?: string;
  xinghao?: string;
}

export class XhmrmsbjData {
  vid: number;
  name: string;
  menshanbujuInfos: ObjectOf<XhmrmsbjInfo>;
  // 板材材质信息:

  constructor(data: XhmrmsbjTableData, menshanKeys: string[], typesInfo: ZixuanpeijianTypesInfo) {
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
      const 模块节点 = this.menshanbujuInfos[key].模块节点 || [];
      for (const v of 模块节点) {
        updateMokuaiItems(v.可选模块, typesInfo, true);
        const 选中模块 = v.选中模块;
        if (选中模块) {
          v.选中模块 = v.可选模块.find((v2) => v2.id === 选中模块.id);
        }
      }
    }
  }
}

export interface XhmrmsbjInfo {
  选中布局?: number;
  模块大小输入?: Formulas;
  模块节点?: XhmrmsbjInfoMokuaiNode[];
}

export interface XhmrmsbjInfoMokuaiNode {
  层id: number;
  层名字: string;
  可选模块: ZixuanpeijianMokuaiItem[];
  选中模块?: ZixuanpeijianMokuaiItem;
}

export const xhmrmsbjTabNames = ["锁边铰边", "门扇模块", "子件更换"] as const;
export type XhmrmsbjTabName = (typeof xhmrmsbjTabNames)[number];
