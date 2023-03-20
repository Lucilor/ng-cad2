import {Formulas} from "@app/utils/calc";
import {updateMokuaiItems, ZixuanpeijianMokuaiItem, ZixuanpeijianTypesInfo} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MsbjPeizhishuju} from "@components/msbj-rects/msbj-rects.types";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {ObjectOf} from "@utils";
import {MsbjInfo} from "@views/msbj/msbj.types";

export interface XhmrmsbjTableData extends TableDataBase {
  peizhishuju?: string;
  xinghao?: string;
  jiaoshanbujuhesuoshanxiangtong?: number;
}

export class XhmrmsbjData {
  vid: number;
  name: string;
  menshanbujuInfos: ObjectOf<XhmrmsbjInfo>;
  铰扇跟随锁扇?: boolean;

  constructor(data: XhmrmsbjTableData, menshanKeys: string[], typesInfo: ZixuanpeijianTypesInfo, msbjs: MsbjInfo[]) {
    this.vid = data.vid;
    this.name = data.mingzi;
    this.铰扇跟随锁扇 = data.jiaoshanbujuhesuoshanxiangtong === 1;
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
      const item = this.menshanbujuInfos[key];
      if (!item.选中布局数据) {
        const msbj = msbjs.find((v) => v.vid === item.选中布局);
        if (msbj) {
          item.选中布局数据 = {vid: msbj.vid, name: msbj.name, 模块大小关系: msbj.peizhishuju.模块大小关系};
        }
      }
      const 模块节点 = item.模块节点 || [];
      for (const v of 模块节点) {
        updateMokuaiItems(v.可选模块, typesInfo, true);
        const 选中模块 = v.选中模块;
        if (选中模块) {
          v.选中模块 = v.可选模块.find((v2) => v2.id === 选中模块.id);
        }
      }
    }
  }

  export() {
    const data: XhmrmsbjTableData = {
      vid: this.vid,
      mingzi: this.name,
      jiaoshanbujuhesuoshanxiangtong: this.铰扇跟随锁扇 ? 1 : 0,
      peizhishuju: JSON.stringify(this.menshanbujuInfos)
    };
    return data;
  }
}

export interface XhmrmsbjInfo {
  选中布局?: number;
  选中布局数据?: {vid: number; name: string; 模块大小关系: MsbjPeizhishuju["模块大小关系"]};
  模块大小输入?: Formulas;
  模块大小输出?: Formulas;
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
