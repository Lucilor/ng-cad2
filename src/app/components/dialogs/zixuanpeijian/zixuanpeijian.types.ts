import {MatDialog} from "@angular/material/dialog";
import {SafeUrl} from "@angular/platform-browser";
import {CadViewerConfig, CadData, CadMtext, CadZhankai, setLinesLength} from "@cad-viewer";
import {KailiaocanshuData} from "@components/klcs/klcs.component";
import {KlkwpzSource} from "@components/klkwpz/klkwpz";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";
import {splitShuangxiangCad, getShuangxiangLineRects, setShuangxiangLineRects, getCadTotalLength} from "@src/app/cad.utils";
import {getCADBeishu} from "@src/app/utils/beishu";
import {Formulas, toFixed} from "@src/app/utils/calc";
import {matchOrderData} from "@src/app/utils/mongo";
import {nameEquals} from "@src/app/utils/zhankai";
import zxpjTestData from "@src/assets/testData/zixuanpeijian.json";
import zixuanpeijianTypesInfo from "@src/assets/testData/zixuanpeijianTypesInfo.json";
import {ObjectOf} from "@utils";
import {isMrbcjfzInfoEmpty, MrbcjfzInfo} from "@views/mrbcjfz/mrbcjfz.types";
import {intersection, isEmpty, isEqual} from "lodash";
import {openDrawCadDialog} from "../draw-cad/draw-cad.component";

export interface ZixuanpeijianTypesInfoItem {
  id: number;
  xiaoguotu: string;
  gongshishuru: string[][];
  xuanxiangshuru: string[][];
  shuchuwenben: string[][];
  suanliaogongshi: Formulas;
  shuchubianliang: string[];
  xinghaozhuanyong: string[];
  mokuaishuoming: string;
  unique: boolean;
  shuruzongkuan: boolean;
  shuruzonggao: boolean;
  morenbancai: ObjectOf<MrbcjfzInfo> | null;
  standalone?: boolean;
  ceshishuju?: Formulas;
  calcVars?: {keys: string[]; result?: Formulas};
}
export type ZixuanpeijianTypesInfo = ObjectOf<ObjectOf<ZixuanpeijianTypesInfoItem>>;

export interface ZixuanpeijianTypesInfoItem2 extends ZixuanpeijianTypesInfoItem {
  disableAdd?: boolean;
}
export type ZixuanpeijianTypesInfo2 = ObjectOf<ObjectOf<ZixuanpeijianTypesInfoItem2>>;

export interface ZixuanpeijianInputsInfoItem {
  totalWidth: InputInfo;
  totalHeight: InputInfo;
  gongshishuru: InputInfo[][];
}
export type ZixuanpeijianInputsInfos = ObjectOf<ObjectOf<ZixuanpeijianInputsInfoItem>>;

export interface ZixuanpeijianData {
  模块?: ZixuanpeijianMokuaiItem[];
  零散?: ZixuanpeijianCadItem[];
  备注?: CadMtext[];
  文本映射?: ObjectOf<string>;
  输出变量?: ObjectOf<string>;
  测试数据?: Formulas[];
}

export interface ZixuanpeijianInput {
  step: number;
  data?: ZixuanpeijianData;
  checkEmpty?: boolean;
  cadConfig?: Partial<CadViewerConfig>;
  order?: {code: string; type: string; materialResult?: Formulas};
  dropDownKeys?: string[];
  stepFixed?: boolean;
  可替换模块?: boolean;
  step1Data?: Step1Data;
}

export type ZixuanpeijianOutput = Required<ZixuanpeijianData>;

export interface ZixuanpeijianInfo {
  houtaiId: string;
  zhankai: {width: string; height: string; num: string; originalWidth: string; cadZhankaiIndex?: number; custom?: boolean}[];
  calcZhankai: any[];
  bancai?: BancaiList & {cailiao?: string; houdu?: string};
  translate?: [number, number];
  hidden?: boolean;
  开料孔位配置?: KlkwpzSource;
  开料参数?: KailiaocanshuData;
}

export interface Bancai extends BancaiList {
  cailiao?: string;
  houdu?: string;
}

export interface ZixuanpeijianCadItem {
  data: CadData;
  displayedData?: CadData;
  info: ZixuanpeijianInfo;
}

export interface ZixuanpeijianMokuaiItem extends ZixuanpeijianTypesInfoItem {
  type1: string;
  type2: string;
  totalWidth: string;
  totalHeight: string;
  cads: ZixuanpeijianCadItem[];
  可替换模块?: ZixuanpeijianMokuaiItem[];
  vars?: Formulas;
}

export interface CadItemInputInfo {
  zhankai: {
    width: InputInfo;
    height: InputInfo;
    num: InputInfo;
  }[];
  板材: InputInfo;
  材料: InputInfo;
  厚度: InputInfo;
}

export interface MokuaiInputInfos {
  总宽: InputInfo<ZixuanpeijianMokuaiItem>;
  总高: InputInfo<ZixuanpeijianMokuaiItem>;
  公式输入: InputInfo[];
  选项输入: InputInfo[];
  输出文本: InputInfo[];
  cads: CadItemInputInfo[];
}

export interface ZixuanpeijianlingsanCadItem {
  data: CadData;
  img: SafeUrl;
  hidden: boolean;
}

export interface CadItemContext {
  $implicit: ZixuanpeijianCadItem;
  i: number;
  j: number;
  type: "模块" | "零散";
}

export interface Step1Data {
  prefix: string;
  typesInfo: ZixuanpeijianTypesInfo;
  options: ObjectOf<string[]>;
}

export const getTestData = () => {
  const data: Required<ZixuanpeijianInput> = {
    step: 1,
    checkEmpty: true,
    stepFixed: false,
    cadConfig: {},
    data: {
      模块: zxpjTestData.模块.map((item) => ({
        ...item,
        cads: item.cads.map((cadItem) => ({...cadItem, data: new CadData()}))
      })),
      零散: zxpjTestData.模块.flatMap((item) => item.cads.map((cadItem) => ({...cadItem, data: new CadData()})))
    },
    order: {code: "1", type: "order", materialResult: zxpjTestData.输出变量},
    dropDownKeys: ["总宽", "总高"],
    可替换模块: true,
    step1Data: zixuanpeijianTypesInfo
  };
  return data;
};

export const importZixuanpeijian = (source: ZixuanpeijianData = {}) => {
  const result: ZixuanpeijianOutput = {
    模块: [],
    零散: [],
    备注: [],
    文本映射: {},
    输出变量: {},
    测试数据: []
  };
  for (const key2 in source) {
    const key = key2 as keyof ZixuanpeijianData;
    if (isEmpty(source[key])) {
      continue;
    }
    result[key] = source[key] as any;
  }
  for (const item of result.模块) {
    for (const cad of item.cads) {
      cad.data = new CadData(cad.data);
      if (cad.displayedData) {
        cad.displayedData = new CadData(cad.displayedData);
      }
    }
    if (item.可替换模块) {
      item.可替换模块 = importZixuanpeijian({模块: item.可替换模块}).模块;
    }
  }
  for (const item of result.零散) {
    item.data = new CadData(item.data);
    if (item.displayedData) {
      item.displayedData = new CadData(item.displayedData);
    }
  }
  result.备注 = result.备注.map((v) => new CadMtext(v));
  return result;
};

export const exportZixuanpeijian = (source: ZixuanpeijianData) => {
  const result: ObjectOf<any> = {};
  const getCadItem = (item: ZixuanpeijianCadItem) => ({
    ...item,
    data: item.data.export(),
    displayedData: item.displayedData?.export()
  });
  for (const key2 in source) {
    const key = key2 as keyof ZixuanpeijianData;
    if (isEmpty(source[key])) {
      continue;
    }
    if (key === "模块") {
      result[key] = source[key]?.map((item) => {
        const item2 = {
          ...item,
          cads: item.cads.map(getCadItem)
        };
        if (item.可替换模块) {
          item2.可替换模块 = exportZixuanpeijian({模块: item.可替换模块}).模块;
        }
        return item2;
      });
    } else if (key === "零散") {
      result[key] = source[key]?.map(getCadItem);
    } else if (key === "备注") {
      result[key] = source[key]?.map((v) => v.export());
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

export const getMokuaiTitle = (item: ZixuanpeijianMokuaiItem) => {
  const {type1, type2} = item;
  if (!type1 && !type2) {
    return "";
  }
  return `${type1}【${type2}】`;
};

export const getStep1Data = async (dataService: CadDataService, params?: {code: string; type: string} | {mokuaiIds: string[]}) => {
  const response = await dataService.post<Step1Data>("ngcad/getZixuanpeijianTypesInfo", params);
  return response?.data;
};

export const getZixuanpeijianCads = async (
  dataService: CadDataService,
  typesInfo: ObjectOf<ObjectOf<1>>,
  materialResult: Formulas = {}
) => {
  const response = await dataService.post<{cads: ObjectOf<ObjectOf<any[]>>; bancais: BancaiList[]}>(
    "ngcad/getZixuanpeijianCads",
    {typesInfo},
    {testData: "zixuanpeijianCads"}
  );
  if (response?.data) {
    const cads: ObjectOf<ObjectOf<CadData[]>> = {};
    const {cads: cadsRaw, bancais} = response.data;
    for (const type1 in cadsRaw) {
      cads[type1] = {};
      for (const type2 in cadsRaw[type1]) {
        cads[type1][type2] = [];
        for (const v of cadsRaw[type1][type2]) {
          const data = new CadData(v);
          delete data.options.功能分类;
          delete data.options.配件模块;
          cads[type1][type2].push(data);
        }
        if (!isEmpty(materialResult)) {
          cads[type1][type2] = matchOrderData(cads[type1][type2], materialResult);
        }
      }
    }
    return {cads, bancais};
  }
  return undefined;
};

export const updateMokuaiItems = (items: ZixuanpeijianMokuaiItem[], typesInfo: ZixuanpeijianTypesInfo, useSlgs = false) => {
  for (const type1 in typesInfo) {
    for (const type2 in typesInfo[type1]) {
      const info = typesInfo[type1][type2];
      for (const item of items) {
        if (item.type2 === type2) {
          const {gongshishuru, xuanxiangshuru, suanliaogongshi, morenbancai} = item;
          Object.assign(item, info);
          if (useSlgs) {
            const getValue = (key: string, value: string) => {
              if (!value && key in suanliaogongshi) {
                return String(suanliaogongshi[key]);
              }
              return value;
            };
            item.totalWidth = getValue("总宽", item.totalWidth);
            item.totalHeight = getValue("总高", item.totalHeight);
          }
          for (const v of item.gongshishuru) {
            v[1] = gongshishuru.find((v2) => v2[0] === v[0])?.[1] || v[1];
          }
          for (const v of item.xuanxiangshuru) {
            v[1] = xuanxiangshuru.find((v2) => v2[0] === v[0])?.[1] || v[1];
          }
          if (morenbancai) {
            if (!item.morenbancai) {
              item.morenbancai = {};
            }
            for (const key in morenbancai) {
              if (isMrbcjfzInfoEmpty(morenbancai[key])) {
                morenbancai[key].默认对应板材分组 = "";
              }
            }
            for (const key in item.morenbancai) {
              if (isMrbcjfzInfoEmpty(item.morenbancai[key])) {
                item.morenbancai[key].默认对应板材分组 = "";
                item.morenbancai[key].选中板材分组 = "";
              } else if (morenbancai[key]) {
                item.morenbancai[key].默认对应板材分组 = morenbancai[key].默认对应板材分组;
                item.morenbancai[key].选中板材分组 = morenbancai[key].选中板材分组;
              }
            }
          }
        }
      }
    }
  }
};

export const getCadLengthVars = (data: CadData) => {
  const getLength = (d: CadData) => Number(toFixed(getCadTotalLength(d), 4));
  const vars: Formulas = {总长: getLength(data)};
  const cads = splitShuangxiangCad(data);
  if (cads) {
    vars.双折宽 = getLength(cads[0]);
    vars.双折高 = getLength(cads[1]);
  }
  return vars;
};

export const getDefaultZhankai = (): ZixuanpeijianInfo["zhankai"][0] => ({width: "", height: "", num: "", originalWidth: ""});

export const calcCadItemZhankai = async (
  calc: CalcService,
  materialResult: Formulas,
  item: ZixuanpeijianCadItem,
  fractionDigits: number
) => {
  const {data, info} = item;
  const {zhankai} = info;
  if (zhankai.length < 1 || !zhankai[0].originalWidth || zhankai[0].custom) {
    return;
  }
  const vars = {...materialResult, ...getCadLengthVars(data)};
  const formulas: ObjectOf<string> = {展开宽: zhankai[0].originalWidth};
  const calcResult = await calc.calcFormulas(formulas, vars, {title: "计算展开"});
  const {展开宽} = calcResult?.succeed || {};
  if (typeof 展开宽 === "number" && !isNaN(展开宽)) {
    zhankai[0].width = toFixed(展开宽, fractionDigits);
  }
  info.zhankai = zhankai;
};

export const calcZxpj = async (
  dialog: MatDialog,
  message: MessageService,
  calc: CalcService,
  materialResult: Formulas,
  mokuais: ZixuanpeijianMokuaiItem[],
  lingsans: ZixuanpeijianCadItem[],
  fractionDigits: number
): Promise<boolean> => {
  const shuchubianliang: Formulas = {};
  const duplicateScbl: ZixuanpeijianMokuaiItem[] = [];
  const duplicateXxsr: ObjectOf<Set<string>> = {};
  const dimensionNamesMap: ObjectOf<{item: ZixuanpeijianCadItem}[]> = {};
  for (const [i, item1] of mokuais.entries()) {
    for (const [j, item2] of mokuais.entries()) {
      if (i === j) {
        continue;
      }
      if (item1.type2 === item2.type2) {
        if (item1.unique) {
          await message.error(`${item1.type1}-${item1.type2}只能单选`);
          return false;
        } else {
          continue;
        }
      }
      const duplicateKeys = intersection(item1.shuchubianliang, item2.shuchubianliang);
      if (duplicateKeys.length > 0) {
        if (!duplicateScbl.find((v) => v.type2 === item1.type2)) {
          duplicateScbl.push(item1);
        }
        if (!duplicateScbl.find((v) => v.type2 === item2.type2)) {
          duplicateScbl.push(item2);
        }
      }
    }
    for (const group of item1.xuanxiangshuru) {
      if (group[0] in materialResult && materialResult[group[0]] !== "无") {
        const title = getMokuaiTitle(item1);
        if (!duplicateXxsr[title]) {
          duplicateXxsr[title] = new Set();
        }
        duplicateXxsr[title].add(group[0]);
      }
    }
    if (Object.keys(duplicateXxsr).length > 0) {
      const str =
        "以下选项输入与订单数据冲突<br>" +
        Object.entries(duplicateXxsr)
          .map(([title, keys]) => `${title}: ${Array.from(keys).join(", ")}`)
          .join("<br>");
      await message.error(str);
      return false;
    }
  }
  if (duplicateScbl.length > 0) {
    const str =
      "输出变量重复<br>" +
      duplicateScbl
        .map((v) => {
          const keys = v.shuchubianliang.join(", ");
          return `${getMokuaiTitle(v)}: ${keys}`;
        })
        .join("<br>");
    await message.error(str);
    return false;
  }
  const getCadDimensionVars = (items: ZixuanpeijianCadItem[]) => {
    const vars: Formulas = {};
    for (const item of items) {
      const data = item.data;
      for (const e of data.entities.dimension) {
        const name = e.mingzi;
        if (!name || e.info.显示公式) {
          continue;
        }
        const points = data.getDimensionPoints(e);
        if (points.length < 4) {
          continue;
        }
        vars[name] = points[2].distanceTo(points[3]);
        if (!dimensionNamesMap[name]) {
          dimensionNamesMap[name] = [];
        }
        dimensionNamesMap[name].push({item});
      }
    }
    return vars;
  };
  const toCalc1 = mokuais.map((item) => {
    const formulas = {...item.suanliaogongshi};
    if (item.shuruzongkuan) {
      formulas.总宽 = item.totalWidth;
    }
    if (item.shuruzonggao) {
      formulas.总高 = item.totalHeight;
    }
    if (item.ceshishuju) {
      Object.assign(formulas, item.ceshishuju);
    }
    for (const group of item.gongshishuru) {
      if (group[0] && group[1]) {
        formulas[group[0]] = group[1];
      }
    }
    for (const group of item.xuanxiangshuru) {
      if (group[0] && group[1]) {
        formulas[group[0]] = `'${group[1]}'`;
      }
    }
    const vars = getCadDimensionVars(item.cads);
    return {formulas, vars, succeedTrim: {} as Formulas, error: {} as Formulas, item};
  });
  const lingsanVars = getCadDimensionVars(lingsans);
  const duplicateDimensionNames: {msg: string; items: ZixuanpeijianCadItem[]}[] = [];
  for (const name in dimensionNamesMap) {
    const group = dimensionNamesMap[name];
    if (group.length > 1) {
      duplicateDimensionNames.push({
        msg: `标注：${name}，cad：${group.map((v) => v.item.data.name).join("，")}`,
        items: group.map((v) => v.item)
      });
    }
  }
  if (duplicateDimensionNames.length > 0) {
    const msg = duplicateDimensionNames.map((v) => v.msg).join("<br>");
    const cads = duplicateDimensionNames.map((v) => v.items.map((v2) => v2.data)).flat();
    await message.alert(`标注重复错误：<br>${msg}`);
    await openDrawCadDialog(dialog, {data: {collection: "cad", cads}});

    return false;
  }

  let initial = true;
  let calc1Finished = false;
  let calcErrors1: Formulas = {};
  let calcErrors2: Formulas = {};
  // const indexesMap: ObjectOf<ObjectOf<number[]>> = {};
  while (!calc1Finished) {
    calc1Finished = true;
    // const shuchubianliangFlag: ObjectOf<ObjectOf<true>> = {};
    const alertError = !initial && isEqual(calcErrors1, calcErrors2);
    calcErrors1 = calcErrors2;
    calcErrors2 = {};
    for (const v of toCalc1) {
      // const {type1, type2} = v.item;
      // if (initial) {
      //     if (!indexesMap[type1]) {
      //         indexesMap[type1] = {};
      //     }
      //     if (!indexesMap[type1][type2]) {
      //         indexesMap[type1][type2] = [];
      //     }
      //     if (!indexesMap[type1][type2].includes(i)) {
      //         indexesMap[type1][type2].push(i);
      //     }
      // }
      // if (shuchubianliangFlag[type1]?.[type2]) {
      //     continue;
      // } else {
      //     shuchubianliangFlag[type1] = shuchubianliangFlag[type1] || {};
      //     shuchubianliangFlag[type1][type2] = true;
      // }
      if (!initial && isEmpty(v.error)) {
        continue;
      }
      const formulas1 = v.formulas;
      const vars1 = {...materialResult, ...lingsanVars, ...v.vars};
      const result1 = await calc.calcFormulas(formulas1, vars1, alertError ? {title: "计算模块"} : undefined);
      // console.log({formulas1, vars1, result1});
      if (!result1) {
        if (alertError) {
          return false;
        } else {
          continue;
        }
      }
      const missingKeys: string[] = [];
      for (const vv of v.item.shuchubianliang) {
        if (vv in result1.succeedTrim) {
          shuchubianliang[vv] = result1.succeedTrim[vv];
        } else {
          missingKeys.push(vv);
        }
      }
      if (missingKeys.length > 0) {
        await message.error(`${getMokuaiTitle(v.item)}缺少输出变量<br>${missingKeys.join(", ")}`);
        return false;
      }
      // Object.assign(materialResult, result1.succeedTrim);
      v.succeedTrim = result1.succeedTrim;
      v.error = result1.error;
      if (!isEmpty(result1.error)) {
        calc1Finished = false;
        calcErrors2 = {...calcErrors2, ...result1.error};
      }
    }
    initial = false;
  }
  // console.log({toCalc1, shuchubianliang});
  Object.assign(materialResult, shuchubianliang);

  const calcCadItem = async ({data, info}: ZixuanpeijianCadItem, vars2: Formulas) => {
    const formulas2: Formulas = {};

    const zhankais: [number, CadZhankai][] = [];
    for (const [i, zhankai] of data.zhankai.entries()) {
      let enabled = true;
      for (const condition of zhankai.conditions) {
        if (!condition.trim()) {
          continue;
        }
        const result = await calc.calcExpression(condition, vars2);
        if (result === null) {
          return false;
        }
        if (!result) {
          enabled = false;
          break;
        }
      }
      if (enabled) {
        zhankais.push([i, zhankai]);
      }
    }
    if (zhankais.length < 1) {
      info.hidden = true;
    } else {
      info.hidden = false;
      for (const [j, e] of data.entities.line.entries()) {
        if (e.gongshi) {
          formulas2[`线${j + 1}公式`] = e.gongshi;
        }
      }
      for (const e of data.entities.dimension) {
        if (e.info.显示公式) {
          if (e.info.显示公式 in vars2) {
            e.mingzi = toFixed(vars2[e.info.显示公式], fractionDigits);
          } else {
            e.mingzi = e.info.显示公式;
          }
        }
      }

      const result2 = await calc.calcFormulas(formulas2, vars2, {title: `计算${data.name}线公式`});
      // console.log({formulas2, vars2, result2});
      if (!result2) {
        return false;
      }
      const shaungxiangCads = splitShuangxiangCad(data);
      const shaungxiangRects = getShuangxiangLineRects(shaungxiangCads);
      for (const key in result2.succeedTrim) {
        const match = key.match(/线(\d+)公式/);
        const value = result2.succeedTrim[key];
        if (match) {
          const index = Number(match[1]);
          // if (typeof value !== "number" || !(value > 0)) {
          //     message.error(`线长公式出错<br>${data.name}的第${index}根线<br>${formulas3[key]} = ${value}`);
          //     return false;
          // }
          setLinesLength(data, [data.entities.line[index - 1]], Number(value));
        }
      }
      setShuangxiangLineRects(shaungxiangCads, shaungxiangRects);
      const vars3 = {...vars2, ...getCadLengthVars(data)};
      const zhankais2: ZixuanpeijianInfo["zhankai"] = [];
      for (const [i, zhankai] of zhankais) {
        const formulas3: Formulas = {};
        formulas3.展开宽 = zhankai.zhankaikuan;
        formulas3.展开高 = zhankai.zhankaigao;
        formulas3.数量 = `(${zhankai.shuliang})*(${zhankai.shuliangbeishu})`;
        const result3 = await calc.calcFormulas(formulas3, vars3, {title: `计算${data.name}的第${i + 1}个展开`});
        if (!result3) {
          return false;
        }
        const width = toFixed(result3.succeedTrim.展开宽, fractionDigits);
        const height = toFixed(result3.succeedTrim.展开高, fractionDigits);
        let num = Number(result3.succeedTrim.数量);
        const {产品分类, 栋数, 门中门扇数} = materialResult;
        const CAD分类 = data.type;
        const CAD分类2 = data.type2;
        try {
          num *= getCADBeishu(String(产品分类 || ""), String(栋数 || ""), CAD分类, CAD分类2, String(门中门扇数 || ""));
        } catch (error) {
          if (error instanceof Error) {
            message.error(error.message);
          }
        }
        zhankais2.push({width, height, num: String(num), originalWidth: zhankai.zhankaikuan, cadZhankaiIndex: i});
      }
      info.zhankai = [...zhankais2, ...info.zhankai.filter((v) => !("cadZhankaiIndex" in v))];
      if (info.zhankai.length < 1) {
        info.zhankai.push(getDefaultZhankai());
      }
      info.calcZhankai = info.zhankai.flatMap((v) => {
        let cadZhankai: CadZhankai | undefined;
        if (v.cadZhankaiIndex && v.cadZhankaiIndex > 0) {
          cadZhankai = data.zhankai[v.cadZhankaiIndex];
        }
        if (!cadZhankai && data.zhankai.length > 0) {
          cadZhankai = new CadZhankai(data.zhankai[0].export());
          cadZhankai.zhankaikuan = v.width;
          cadZhankai.zhankaigao = v.height;
          cadZhankai.shuliang = v.num;
        }
        if (!cadZhankai) {
          return {};
        }
        const calcObj: ObjectOf<any> = {
          name: cadZhankai.name,
          kailiao: cadZhankai.kailiao,
          kailiaomuban: cadZhankai.kailiaomuban,
          neikaimuban: cadZhankai.neikaimuban,
          chai: cadZhankai.chai,
          flip: cadZhankai.flip,
          flipChai: cadZhankai.flipChai,
          neibugongshi: cadZhankai.neibugongshi,
          calcW: Number(v.width),
          calcH: Number(v.height),
          num: Number(v.num),
          包边正面按分类拼接: cadZhankai.包边正面按分类拼接,
          属于正面部分: false,
          属于框型部分: false,
          默认展开宽: !!nameEquals(cadZhankai.zhankaikuan, [
            "ceil(总长)+0",
            "ceil(总长)+0+(总使用差值)",
            "总长+(总使用差值)",
            "总长+0+(总使用差值)"
          ])
        };
        ["门扇上切", "门扇下切", "门扇上面上切", "门扇下面下切"].forEach((qiekey) => {
          if (cadZhankai?.zhankaigao.includes(qiekey) && materialResult[qiekey] > 0) {
            if (qiekey.includes("上切")) {
              calcObj["上切"] = materialResult[qiekey];
            } else {
              calcObj["下切"] = materialResult[qiekey];
            }
          }
        });
        if (cadZhankai.chai) {
          calcObj.num = 1;
          const calc2 = [];
          calc2.push(calcObj);
          for (let i = 1; i < calcObj.num; i++) {
            const calc1 = JSON.parse(JSON.stringify(calcObj));
            if (!calc1.flip) {
              calc1.flip = [];
            }
            calc1.name = `${cadZhankai.name}${i}`;
            calc2.push(calc1);
          }
          return calc2;
        }
        return calcObj;
      });
    }
    return true;
  };

  for (const [i, item] of mokuais.entries()) {
    const vars2: Formulas = {...materialResult, ...lingsanVars, ...toCalc1[i].succeedTrim, ...shuchubianliang};
    if (item.calcVars) {
      item.calcVars.result = {};
      for (const key of item.calcVars.keys) {
        const value = await calc.calcExpression(key, vars2);
        if (value !== null) {
          item.calcVars.result[key] = value;
        }
      }
    }
    for (const cadItem of item.cads) {
      if (!(await calcCadItem(cadItem, vars2))) {
        return false;
      }
    }
  }
  for (const item of lingsans) {
    if (!(await calcCadItem(item, {...materialResult, ...lingsanVars}))) {
      return false;
    }
  }
  return true;
};
