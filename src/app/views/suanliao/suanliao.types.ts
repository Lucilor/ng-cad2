import {Formulas} from "@app/utils/calc";
import {CalcZxpjResult, ZixuanpeijianCadItem, ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {ObjectOf} from "@lucilor/utils";
import {XhmrmsbjInfo} from "@views/xhmrmsbj/xhmrmsbj.types";

export interface SuanliaoInput {
  materialResult: Formulas;
  gongshi: Formulas;
  inputResult: Formulas;
  型号选中门扇布局: ObjectOf<XhmrmsbjInfo>;
  配件模块CAD: ObjectOf<ObjectOf<any[]>>;
  门扇布局CAD: any[];
  bujuNames: string[];
  varNames: string[];
  silent?: boolean;
}

export interface SuanliaoOutputData {
  action: "suanliaoEnd";
  data: SuanliaoOutput;
}

export interface SuanliaoOutput extends CalcZxpjResult {
  materialResult: Formulas;
  materialResultDiff: Formulas;
  配件模块CAD: ZixuanpeijianMokuaiItem[];
  门扇布局CAD: ZixuanpeijianCadItem[];
}

export interface 根据输入值计算选中配件模块无依赖的公式结果输入 {
  vars: Formulas;
  型号选中门扇布局: ObjectOf<XhmrmsbjInfo>;
}

export interface 根据输入值计算选中配件模块无依赖的公式结果输出 {
  成功: ObjectOf<Formulas>;
  失败: ObjectOf<Formulas>;
}
