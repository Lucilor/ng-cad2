import {ZixuanpeijianTypesInfoItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf} from "@utils";

export interface XhmrmsbjTableData extends TableDataBase {
  peizhishuju?: string;
  xinghao?: string;
}

export const menshanKeys = ["锁扇正面", "锁扇背面", "铰扇正面", "铰扇背面", "小扇正面", "小扇背面"] as const;

export class XhmrmsbjData {
  vid: number;
  name: string;
  menshanbujuInfos: ObjectOf<XhmrmsbjInfo>;
  // 板材材质信息:

  constructor(data: XhmrmsbjTableData) {
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

export interface XhmrmsbjInfo {
  选中布局?: number;
  模块大小关系?: Formulas;
  模块节点?: {
    层id: number;
    层名字: string;
    可选模块: XhmrmsbjMokuai[];
    选中模块: XhmrmsbjMokuai;
  }[];
}

export class XhmrmsbjMokuai {
  模块id: number;
  模块名字: string;
  公式输入: Formulas;
  选项输入: Formulas;
  板材数据: ObjectOf<{
    花件: string[];
    CAD: string[];
    选中板材分组: string;
  }>;

  constructor(info: ZixuanpeijianTypesInfoItem, type1: string, type2: string) {
    this.模块id = info.id;
    this.模块名字 = type2;
    this.公式输入 = {};
    for (const [k, v] of info.gongshishuru) {
      this.公式输入[k] = v;
    }
    this.选项输入 = {};
    for (const [k, v] of info.xuanxiangshuru) {
      this.选项输入[k] = v;
    }
    this.板材数据 = {};
  }
}
