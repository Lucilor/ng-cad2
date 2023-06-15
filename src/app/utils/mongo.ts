import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {difference, isEmpty} from "lodash";
import {splitOptions} from "../app.common";
import {Calc} from "./calc";
import {toFixed} from "./func";

export const matchOrderData = (data: CadData[], materialResult: any) => {
  if (isEmpty(materialResult)) {
    return [];
  }

  // 循环筛选
  return data.filter((value) => {
    // 判断选项
    if (!isOptionsOK(value.options, materialResult)) {
      return false;
    }

    // 判断条件
    if (!isConditionOK(value.conditions, materialResult)) {
      return false;
    }

    return true;
  });
};

export const isOptionsOK = (options: ObjectOf<string>, materialResult: ObjectOf<any>) => {
  let ok = true;
  let optionArr: string[] = []; //保存提取出来的二级选项, 即选项为数组情况

  if (isEmpty(options)) {
    return true;
  }

  // 分离
  // 选项形式：{工艺: 62}、{工艺: 62,68},  {工艺: [62, 68]}；
  // 当前选项：materialResult【工艺】= 62
  for (const key2 in options) {
    const key = key2.replace(" ", "");
    let value = options[key2];
    if (typeof value === "string") {
      value = value.replace(" ", "");
    }

    // 1、选择所有, 不判断,直接通过
    if (value === "所有" || value === "全部") {
      continue;
    }

    // 2、当前结果没有选项,结束不通过
    if (materialResult[key] === undefined) {
      return false;
    }

    // 去掉空, '', 0, false, null
    if (Array.isArray(value)) {
      optionArr = value.filter((v) => v);
    } else {
      optionArr = splitOptions(value).filter((v) => v);
    }

    // 去除空格
    optionArr = optionArr.map((v) => v.replace(" ", ""));

    // 4、判断当前选项是否满足选项要求,例如当前key：包边
    // option：a,b,c,不选e；
    // current：【a,c】,满足；【a,e】,不满足；
    // 说明,选项内部不选必须满足,其余选上某些就满足；选项与选项必须同时满足
    let currentOption: string[] = materialResult[key];
    if (!Array.isArray(currentOption)) {
      currentOption = [currentOption];
    }

    const xuan: string[] = [];
    for (const option of optionArr) {
      if (option.includes("不选")) {
        if (currentOption.includes(option.replace("不选", ""))) {
          return false;
        }
      } else {
        xuan.push(option);
      }
    }

    // 除了不选外,没有选项,认为是全部,通过筛选
    if (xuan.length < 1) {
      continue;
    }

    /**
     * NOTE: difference没处理类型不一样的问题，比如门扇厚度就可能会出错（string、number比较）
     *
     * 由于这里全都是选项，每一个值理论上都是字符串，将数字都转为字符串做比较
     */
    for (let i = 0; i < currentOption.length; i++) {
      const val = currentOption[i];

      // 只处理数字
      if (typeof val != "number") {
        continue;
      }

      currentOption[i] = toFixed(val, 3);
    }

    for (let i = 0; i < xuan.length; i++) {
      const val = xuan[i];

      // 只处理数字
      if (typeof val != "number") {
        continue;
      }

      xuan[i] = toFixed(val, 3);
    }

    const diff = difference(currentOption, xuan);

    // if (obj['名字'] == 'SD-13铰' && key =='防撬边') {
    //     echo json_encode([diff, currentOption, xuan], 256);
    //     die;
    // }

    if (diff.length > 0) {
      // 说明当前选项有不满足要求的
      ok = false;
      break;
    }
  }

  return ok;
};

export const isConditionOK = (conditions: string[], vars: ObjectOf<any>, errorAlert = true) => {
  if (isEmpty(conditions)) {
    return true;
  }
  for (const condition of conditions) {
    if (!isConditionOneOK(condition, vars, errorAlert)) {
      return false;
    }
  }
  return true;
};

const isConditionOneOK = (condition: string, vars: ObjectOf<any>, errorAlert = true) => {
  if (!condition) {
    return true;
  }
  condition = condition.replaceAll(" ", "").replaceAll(" ", ""); // 替换去除中文英文空格
  if (condition === "") {
    return true;
  }
  condition = convertChineseSymbol(condition);
  delete vars.R;
  delete vars.T;
  const result = Calc.calcExpress(`!!(${condition})`, vars);
  if (result.error) {
    if (errorAlert) {
      throw new Error(`计算条件出错： ${condition}<br />${result.error}`);
    }
  }
  return result.value;
};

const convertChineseSymbol = (str: string): string => {
  if (!str || typeof str !== "string") {
    return str;
  }

  const convertMap = [
    ["“", '"'],
    ["”", '"'],
    ["‘", "'"],
    ["’", "'"],
    ["，", ","]
  ];

  convertMap.forEach((kv) => {
    const [original, replace] = kv;

    str = str.replace(new RegExp(original, "g"), replace);
  });

  return str;
};
