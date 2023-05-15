/*
 * Filename: /Users/bfchen/Desktop/sites/JSModule/src/TSModule/utils/zhankai.ts
 * Path: /Users/bfchen/Desktop/sites/JSModule
 * Created Date: Friday, September 9th 2022, 9:28:18 am
 * Author: bfchen
 *
 * Copyright (c) 2022 Your Company
 */
import {ObjectOf} from "@utils";
import {Cast2Number, Cast2String, toFixed} from "./calc";

/* eslint-disable */
export interface Dictionary<T> {
  [index: string]: T;
}

export const getCalcZhankaiText = (
  CAD来源 = "算料",
  calcZhankai: any[],
  materialResult: ObjectOf<any>,
  板材: string,
  板材厚度: string,
  材料: string,
  项目配置: ObjectOf<any>,
  项目名: string,
  cadProps: ObjectOf<any>,
  overrideDic?: ObjectOf<any>
) => {
  const getDicValue = (dic: ObjectOf<any>, key: string, fallback?: any) => {
    return dic?.[key] ?? fallback;
  };

  const getXiangmupeizhi = (key: string, fallback?: string) => {
    return getDicValue(项目配置, key, fallback) as string;
  };

  const unresolver = (key: string, rawKey?: string | null) => {
    return materialResult?.[key] ?? "";
  };

  const trimUnnecessaryZero = (text: string, lianjiefu: string) => {
    text = text.replace("0" + lianjiefu + "0", "");
    text = text.replace("^0" + lianjiefu, "");
    text = text.replace(lianjiefu + "0", "");

    return text;
  };

  const lstrip = (str: string, char?: string) => {
    if (!str) return str;
    if (!char) return str.trimStart();

    while (str.length && str[0] == char) {
      str = str.substring(1);
    }

    return str;
  };

  const rstrip = (str: string, char?: string) => {
    if (!str) return str;
    if (!char) return str.trimEnd();

    while (str.length && str[str.length - 1] == char) {
      str = str.substring(0, str.length - 1);
    }

    return str;
  };

  const strip = (str: string, char?: string) => {
    return lstrip(rstrip(str, char), char);
  };

  const renderText = (text: string, replacement: ObjectOf<any>, alias = null, unresolver: any = null, deps: any[] | null = null) => {
    const matches = [...text.matchAll(/#.*?#/g)].map((v) => v[0]);
    const keyDeps = deps ?? [];
    // 将字符串模板替换成具体值
    for (const match of matches) {
      const key = strip(match, "#");
      if (keyDeps.includes(key)) {
        // 循环引用
        return text;
      }

      const newKeyDeps = [...keyDeps];
      newKeyDeps.push(key);
      const rawKey = null;
      let val = replacement[key] ?? null;
      if (val == null && unresolver) {
        val = unresolver(key, rawKey);
      }
      // 如果最后找到了就替换渲染到模板
      if (val != null) {
        val = Cast2String(val);
        // 如果替换的文本也存在#xxx#，即也是一个字符串模板，则递归替换
        // 这几个特殊的东西不要去替换：花件信息、门扇正面板材、门扇背面板材、备注（所有）
        let isSpecialKey = false;
        if (
          key == "花件信息" ||
          key == "花件信息2" ||
          key == "门扇正面板材" ||
          key == "门扇背面板材" ||
          nameIncludes(key, "备注") ||
          nameIncludes(key, "封板信息")
        ) {
          isSpecialKey = true;
        }
        if (!isSpecialKey && nameIncludes(val, "#")) {
          val = renderText(val, replacement, alias, unresolver, newKeyDeps);
        }
        text = text.replace(match, val);
      }
    }

    return text;
  };

  const getZhankaiShangxiaqieInfo = (uniqueZhankai: any) => {
    if (uniqueZhankai == null) {
      return "";
    }

    const needShangxiaqieInfo = materialResult["开启"] == "内开";

    const menshanshangqie = uniqueZhankai[4];
    const menshanxiaqie = uniqueZhankai[5];

    const shangxiaqieReplacement = {
      门扇上切: menshanshangqie,
      门扇下切: menshanxiaqie
    };

    const hasShangqie = menshanshangqie != "-1" && menshanshangqie != "0";
    const hasXiaqie = menshanxiaqie != "-1" && menshanxiaqie != "0";

    const needShangqieInfo = needShangxiaqieInfo && hasShangqie;
    let needXiaqieInfo = needShangxiaqieInfo && hasXiaqie;

    let shangqieInfo = getXiangmupeizhi("算料单上切信息", "门扇上切#门扇上切#");
    let xiaqieInfo = getXiangmupeizhi("算料单下切信息", "门扇下切#门扇下切#");

    if (needShangxiaqieInfo && menshanxiaqie == "0") {
      needXiaqieInfo = true;
      xiaqieInfo = "下不缩短";
    }

    const shangxiaqieOnOneLine = getXiangmupeizhi("算料单上下切信息显示为一行", "否") == "是";
    shangqieInfo = renderText(shangqieInfo, shangxiaqieReplacement);
    xiaqieInfo = renderText(xiaqieInfo, shangxiaqieReplacement);

    let shangxiaqieCombineInfo = "";

    if (shangxiaqieOnOneLine) {
      const combineInfo = [];
      if (needShangqieInfo) {
        combineInfo.push(shangqieInfo);
      }
      if (needXiaqieInfo) {
        combineInfo.push(xiaqieInfo);
      }
      if (combineInfo.length) {
        shangxiaqieCombineInfo = combineInfo.join(",");
      }
    } else {
      if (needShangqieInfo) {
        shangxiaqieCombineInfo += "\n" + shangqieInfo;
      }
      if (needXiaqieInfo) {
        shangxiaqieCombineInfo += "\n" + xiaqieInfo;
      }

      shangxiaqieCombineInfo = lstrip(shangxiaqieCombineInfo);
    }

    return shangxiaqieCombineInfo;
  };

  if (!overrideDic) overrideDic = {};

  const name = getDicValue(cadProps, "name", "");

  // 算料单是否显示CAD名字
  let showCADName = getXiangmupeizhi("算料单显示CAD名字", "否") == "是";
  // showCADName = false
  showCADName = showCADName && !getDicValue(overrideDic, "forceNoCADName", false);
  let isQiliaoCAD = getDicValue(overrideDic, "isQiliao", false);

  const menkuangchicunyaoqiu = unresolver("门框尺寸要求", null);
  let needKuanZhunque = menkuangchicunyaoqiu && nameIncludes(menkuangchicunyaoqiu, "宽准确");
  let needGaoZhunque = menkuangchicunyaoqiu && nameIncludes(menkuangchicunyaoqiu, "高准确");

  let baobianyanchang = unresolver("包边延长", null);
  let needBaobianyanchang = true;
  if (baobianyanchang == null || baobianyanchang == "0") {
    baobianyanchang = "";
    needBaobianyanchang = false;
  }

  const hasDikuang2 = getDicValue(overrideDic, "hasDikuang2", false);
  const isDikuang2 = getDicValue(overrideDic, "dikuang2", false);
  const dikuang2X = getDicValue(overrideDic, "dikuang2X", false);
  const forceHideLength = getDicValue(overrideDic, "hideLength", false);
  const 强制显示板材 = getDicValue(overrideDic, "强制显示板材", false);

  // 算料单CAD名字显示位置
  const showCADNamePosition = getXiangmupeizhi("算料单CAD名字显示位置", "展开前面");
  const showCADNameBeforeZhankai = showCADNamePosition == "展开前面";
  const showCADNameAtLastLine = showCADNamePosition == "最后一行";
  // showCADNameBeforeZhankai = false
  // showCADNameAtLastLine = true
  let zhankaiName = "";

  // 算料单是否显示展开宽
  // 如果CAD有自定义属性，算料单显示展开宽：是，就要显示
  const showZhankaikuan = getXiangmupeizhi("算料单不显示展开宽", "否") == "否";

  needGaoZhunque = needGaoZhunque && CAD来源 == "横截面" && nameEquals(name, ["左包边", "右包边"]);
  needKuanZhunque = needKuanZhunque && CAD来源 == "纵截面" && nameEquals(name, ["顶包边"]);

  needBaobianyanchang = needBaobianyanchang && CAD来源 == "横截面" && nameEquals(name, ["左包边", "右包边"]);
  if (项目名 == "kgs") {
    needBaobianyanchang = false;
  }

  let cadShowZhankaikuan = showZhankaikuan;

  const 自定义属性 = getDicValue(cadProps, "attributes", {});
  const isXuniqiliao = getDicValue(自定义属性, "虚拟企料", "否") == "是";

  // 当为是时，只显示展开等信息，CAD、线长文字、标注、指定刨坑箭头等都不显示
  const forceShowZhankaikuan = getDicValue(自定义属性, "算料单显示展开宽", "否") == "是";
  if (forceShowZhankaikuan) {
    cadShowZhankaikuan = true;
  }

  // 门中门就不显示了，会压住显示
  if (nameIncludes(name, "门中门")) {
    showCADName = false;
  }

  let seka = 板材;
  let isZaban = false;
  let showZaban = true;
  if (seka == "同框色" && materialResult?.["包边板材"]) {
    seka = materialResult["包边板材"];
  }
  if (seka == "同扇色" && materialResult?.["门扇板材"]) {
    seka = materialResult["门扇板材"];
  }
  if (nameEquals(项目名, ["sd", "sd2"])) {
    if (
      name == "骨架" ||
      nameIncludes("杂板", name) ||
      nameIncludes(name, "杂板") ||
      nameIncludes("中柱", name) ||
      nameIncludes("门中门反面盖板", name)
    ) {
      // 杂板不带色卡的
      // 中柱也不带色卡
      seka = "\n开杂板";
      isZaban = true;
      if (nameIncludes("中柱", name)) {
        showZaban = false;
      }
    }
  }

  // 写入色卡、算料
  const isAssembly = getDicValue(overrideDic, "assembly", false);

  // 中板压花板，展开的名字和CAD显示名字都改成二级的名字
  const isZhongban = nameIncludes(getDicValue(自定义属性, "是横板", ""), "中板");
  let isZhongbanyahuaban = false;
  let zhongbanyahuaban = "";
  if (isZhongban) {
    zhongbanyahuaban = unresolver("中板压花板", null);
    if (zhongbanyahuaban && zhongbanyahuaban != "无") {
      isZhongbanyahuaban = true;
    }
  }

  // 存在多种可能值：名字、展开宽、展开高、尺寸、板材
  // 需要做兼容：
  // 以前的尺寸+板材、尺寸、板材，需不需要名字是读取项目配置的
  // 新的展开宽、展开高等，需不需要名字是读取属性值的
  // "尺寸+板材",（旧）
  // "尺寸",（旧）
  // "板材",（旧）
  // "名字+展开宽+展开高",
  // "名字+展开高+板材",
  // "名字+展开高",
  // "展开宽+展开高+板材",
  // "展开宽+展开高",
  // "展开高+板材",
  // "都不显示"
  const 算料单显示 = getDicValue(cadProps, "suanliaodanxianshi", "尺寸+板材");
  const suanliaodanxianshi = 算料单显示.split("+");

  let isNewXianshiConfig = true;
  if (nameEquals("尺寸", suanliaodanxianshi) || (suanliaodanxianshi.length == 1 && "板材" == suanliaodanxianshi[0])) {
    isNewXianshiConfig = false;
  }

  let suanliaodanNeedName = false;
  let suanliaodanNeedZhankaikuan = true;
  let suanliaodanNeedZhankaigao = true;
  let suanliaodanNeedBancai = true;
  // 是否先显示展开高，再显示展开宽
  let suanliaodanDisplayZhankaigaoFirst = false;
  if (isNewXianshiConfig) {
    suanliaodanNeedName = !!nameEquals("名字", suanliaodanxianshi);
    suanliaodanNeedZhankaikuan = !!nameEquals("展开宽", suanliaodanxianshi);
    suanliaodanNeedZhankaigao = !!nameEquals("展开高", suanliaodanxianshi);
    suanliaodanNeedBancai = !!nameEquals("板材", suanliaodanxianshi);
    if (suanliaodanNeedZhankaikuan && suanliaodanNeedZhankaigao) {
      if (suanliaodanxianshi.indexOf("展开高") < suanliaodanxianshi.indexOf("展开宽")) {
        suanliaodanDisplayZhankaigaoFirst = true;
      }
    }
  } else {
    suanliaodanNeedName = showCADName;
    suanliaodanNeedZhankaikuan = !!nameEquals("尺寸", suanliaodanxianshi);
    if (!cadShowZhankaikuan) {
      suanliaodanNeedZhankaikuan = false;
    }
    suanliaodanNeedZhankaigao = !!nameEquals("尺寸", suanliaodanxianshi);
    suanliaodanNeedBancai = !!nameEquals("板材", suanliaodanxianshi);
    if (!getDicValue(cadProps, "suanliaodanxianshibancai", true)) {
      suanliaodanNeedBancai = false;
    }
  }

  if (name == "左包边" || name == "右包边") {
    suanliaodanNeedZhankaikuan = true;
    suanliaodanNeedZhankaigao = true;
  }

  for (const exp of suanliaodanxianshi) {
    const match = exp.match("^(?:不显示|不需要|不要)(.*)");
    if (match) {
      if (exp == "名字") {
        suanliaodanNeedName = false;
      }
      if (exp == "尺寸") {
        suanliaodanNeedZhankaikuan = false;
        suanliaodanNeedZhankaigao = false;
      }
      if (exp == "展开宽") {
        suanliaodanNeedZhankaikuan = false;
      }
      if (exp == "展开高") {
        suanliaodanNeedZhankaigao = false;
      }
      if (exp == "板材") {
        suanliaodanNeedBancai = false;
      }
    }
  }

  if (suanliaodanxianshi[0] == "都不显示") {
    suanliaodanNeedName = false;
    suanliaodanNeedZhankaikuan = false;
    suanliaodanNeedZhankaigao = false;
    suanliaodanNeedBancai = false;
  }

  let suanliaodanqiangzhibuxianshizhankaikuan =
    getXiangmupeizhi("算料单强制不显示展开宽", "否") == "是" || getXiangmupeizhi("算料单全部CAD不显示展开宽", "否") == "是";

  if (getDicValue(cadProps, "shuangxiangzhewan", false)) {
    suanliaodanqiangzhibuxianshizhankaikuan = false;
  }

  // 中板压花板必须显示名字
  if (isZhongbanyahuaban) {
    suanliaodanNeedName = true;
  }

  const isSuanliaoCAD = CAD来源 == "算料";
  isQiliaoCAD = CAD来源 == "横截面" && nameIncludes("企料", name);

  let hideBancaiIfSameWithMenshanbancai = false;
  let sameWithMenshanbancai = false;

  if (
    (isSuanliaoCAD || isQiliaoCAD) &&
    getXiangmupeizhi("算料单门扇算料CAD使用门扇板材则不显示", "否") == "是" &&
    getDicValue(自定义属性, "强制显示板材", "") != "是"
  ) {
    hideBancaiIfSameWithMenshanbancai = true;

    const menshanbancai = materialResult?.["门扇板材"];
    const menshanbancaihoudu = materialResult?.["门扇板材厚度"];
    const menshanbancaicailiao = materialResult?.["门扇板材材料"];

    const cadbancai = seka;
    const cadbancaihoudu = 板材厚度;
    const cadbancaicailiao = 材料;

    const menshanbancaiText = menshanbancai + menshanbancaihoudu + menshanbancaicailiao;
    const cadbancaiText = cadbancai + cadbancaihoudu + cadbancaicailiao;

    // CAD的板材和门扇板材完全一样则不显示
    if (cadbancaiText == menshanbancaiText) {
      suanliaodanNeedBancai = false;
      sameWithMenshanbancai = true;
    }
  }
  if (强制显示板材) {
    suanliaodanNeedBancai = true;
  }

  let zhankailianjiefu = getXiangmupeizhi("算料单展开x替换", "×");
  if (!zhankailianjiefu) {
    zhankailianjiefu = "×";
  }

  // 算料
  const hideDefaultZhankaikuan = getXiangmupeizhi("算料单不显示默认展开宽ceil(总长)+0", "") == "是";

  const additionZhankai = [];

  for (const zhankai of calcZhankai) {
    additionZhankai.push(zhankai);
  }

  // 展开数合并，若名字、宽、高一致则数量叠加
  const uniqueZhankai: any = [];
  for (const zhankai of additionZhankai) {
    const name = zhankai["name"];
    const isDefaultZhankaikuan = !!zhankai["默认展开宽"];
    let width = "";
    if (zhankai?.["idealW"]) {
      width = zhankai["idealW"];
    } else {
      width = toFixed(zhankai["calcW"], 2);
    }
    const height = toFixed(zhankai["calcH"], 2);
    if (!zhankai?.["num"]) {
      throw new Error("CAD：" + name + "，展开结构有问题，缺少num字段");
    }
    if (zhankai["num"] == null) {
      throw new Error("CAD：" + name + "，展开有问题，数量算出来为NULL");
    }
    const num = toFixed(zhankai["num"], 0);
    const shangqie = toFixed(zhankai["上切"] ?? 0, 0);
    const xiaqie = toFixed(zhankai["下切"] ?? 0, 0);
    const shangzhe = toFixed(zhankai["上折附加值"] ?? 0, 0);
    const xiazhe = toFixed(zhankai["下折附加值"] ?? 0, 0);

    // 看下有没有一样的展开数
    let hasSame = false;
    for (const uZhankai of uniqueZhankai) {
      const 展开合并规则考虑名字 = getXiangmupeizhi("展开合并规则考虑名字", "否") == "是";
      // if (uZhankai[0] == name && uZhankai[1] == width && uZhankai[2] == height) {
      let isTheSame = false;
      if (展开合并规则考虑名字) {
        isTheSame =
          uZhankai[0] == name && uZhankai[1] == width && uZhankai[2] == height && uZhankai[4] == shangqie && uZhankai[5] == xiaqie;
      } else {
        isTheSame = uZhankai[1] == width && uZhankai[2] == height && uZhankai[4] == shangqie && uZhankai[5] == xiaqie;
      }
      // 上下切一样的才能合并，不然会出错
      if (isTheSame) {
        hasSame = true;
        // 有相同的展开则合并数量
        uZhankai[3] = toFixed(Cast2Number(num) + Cast2Number(uZhankai[3]), 0);
        break;
      }
    }

    // 没有一样的就添加
    if (!hasSame) {
      uniqueZhankai.push([name, width, height, num, shangqie, xiaqie, isDefaultZhankaikuan, shangzhe, xiazhe]);
    }
  }

  // 是否有多个不一样的展开
  const multiZhankai = uniqueZhankai.length > 1;

  if (isZhongbanyahuaban) {
    for (const uZhankai of uniqueZhankai) {
      uZhankai[0] = zhongbanyahuaban;
    }
    cadProps["xianshimingzi"] = zhongbanyahuaban;
  }

  const 算料处理 = getDicValue(cadProps, "suanliaochuli", "");
  const 显示展开 = !!nameIncludes(算料处理, "显示展开");

  let needSuanliao = true;
  if (!suanliaodanNeedZhankaikuan && !suanliaodanNeedZhankaigao) {
    needSuanliao = false;
  }

  // 如果CAD名字是显示在展开前面的，但是又不需要算料的话，也要显示名字出来
  let needSuanliaoNameOnly = false;
  if (showCADNameBeforeZhankai && !needSuanliao && CAD来源 != "示意图") {
    needSuanliao = true;
    needSuanliaoNameOnly = true;
  }

  let needSeka = true;
  let needBancaihouduInfo = true;
  let menkuangbancai = "";

  if (nameEquals(CAD来源, ["横截面", "纵截面"])) {
    if (nameEquals(name, ["左包边", "右包边", "顶包边", "地面", "中横框"])) {
      needSeka = false;
    }
    if (/^企料\d+/.test(name) != null) {
      needSeka = false;
    }
    if (nameIncludes("双包边", name) || nameIncludes("双包边饰条", name)) {
      if (nameIncludes("饰条", name)) {
        needSeka = false;
      } else {
        menkuangbancai = materialResult["包边板材"];
        needBancaihouduInfo = false;
        if (seka != menkuangbancai) {
          needSeka = true;
        }
      }
    }
  }

  if (nameIncludes(seka, "杂板")) {
    needSeka = false;
  }

  if (!suanliaodanNeedBancai) {
    needSeka = false;
  }

  // 如果是企料，但是色卡和企料颜色又不一样，则要显示板材（企料独立板材的那些）
  if (isQiliaoCAD && seka != unresolver("企料颜色", "")) {
    needSeka = true;
    needBancaihouduInfo = getXiangmupeizhi("算料单企料独立板材需要显示板材厚度", "") == "是";
  }

  // 和门扇板材一样则隐藏的项目，如果企料和门扇板材不一样也得显示出来
  if (isQiliaoCAD && hideBancaiIfSameWithMenshanbancai && !sameWithMenshanbancai) {
    needSeka = true;
    needBancaihouduInfo = getXiangmupeizhi("算料单企料独立板材需要显示板材厚度", "") == "是";
  }

  if (getDicValue(自定义属性, "强制不显示板材厚度", "") == "是") {
    needBancaihouduInfo = false;
  }

  const needPaokeng = getDicValue(cadProps, "kailiaoshipaokeng", false);

  const zhidingweizhipaokeng = getDicValue(cadProps, "zhidingweizhipaokeng", null);

  // 箭头、箭头+箭头旁文字、虚线圆、虚线圆+旁边文字
  const 指定位置刨坑表示方法 = getXiangmupeizhi("指定位置刨坑表示方法", "箭头");
  // 只有当表示方式为箭头时（全刨坑也要），才额外显示文字
  const paokengIsJiantouStyle = 指定位置刨坑表示方法 == "箭头";

  let paokengInfo = "";
  const paokengInfoPrefix = ",";

  if (paokengIsJiantouStyle && zhidingweizhipaokeng && zhidingweizhipaokeng.length != 0) {
    paokengInfo = paokengInfoPrefix + "刨坑(箭头)";
  }

  if (needPaokeng) {
    paokengInfo = paokengInfoPrefix + "刨坑";
  }

  if (isXuniqiliao) {
    paokengInfo = "";
  }

  // 当只有一个展开时，刨坑信息接到展开后面
  let paokengInfoAfterZhankai = false;

  const 刨坑换行配置 = getXiangmupeizhi("算料单刨坑信息换行显示", "否");
  let paokengInfoOnullLine = 刨坑换行配置 == "是";
  if (isQiliaoCAD || 刨坑换行配置 == "强制") {
    paokengInfoOnullLine = true;
  } else {
    // 当只有一个展开时，强制不单独一行显示刨坑信息，直接跟在展开后面
    if (!nameEquals(项目名, ["sd", "sd2", "gym", "kgs"]) && !multiZhankai && paokengInfo != "") {
      paokengInfoOnullLine = false;
      paokengInfoAfterZhankai = true;
    }
  }

  if (paokengInfo != "" && paokengInfoOnullLine) {
    paokengInfo = "\n" + paokengInfo.trim();
  }

  const hasPaokeng = paokengInfo != "";

  const 板材厚度前缀 = getXiangmupeizhi("算料单CAD板材厚度前缀", "");

  let bancaihouduInfo = "";

  if (getXiangmupeizhi("算料单的算料CAD不显示板材厚度", "") == "是" && isSuanliaoCAD) {
    bancaihouduInfo = 材料 + "/";
  } else {
    bancaihouduInfo = 板材厚度前缀 + 板材厚度 + "/" + 材料 + "/";
  }

  if (bancaihouduInfo == "/" || bancaihouduInfo == "//") {
    bancaihouduInfo = "";
  }
  if ((nameIncludes("包边饰条", name) && getXiangmupeizhi("算料单不显示包边饰条板材厚度", "否") == "是") || !needBancaihouduInfo) {
    bancaihouduInfo = "";
  }

  let sekaText = "";

  if (paokengInfoAfterZhankai) {
    sekaText = paokengInfo + "\n" + bancaihouduInfo + seka;
  } else {
    sekaText = bancaihouduInfo + seka + paokengInfo;
  }

  const suanliaoCADBancaiInNewLine = getXiangmupeizhi("算料单算料CAD板材厚度换行显示", "") == "是";

  if (
    (项目名 == "sd" || 项目名 == "sd2" || 项目名 == "yhmy" || suanliaoCADBancaiInNewLine) &&
    (nameIncludes(getDicValue(cadProps, "houtaiFenlei", ""), "算料") || isQiliaoCAD)
  ) {
    if (paokengInfoAfterZhankai) {
      sekaText = paokengInfo + "\n" + rstrip(bancaihouduInfo, "/") + "\n" + seka;
    } else {
      sekaText = rstrip(bancaihouduInfo, "/") + "\n" + seka + paokengInfo;
    }
  }

  const showCADBancaiwenlifangxiangInfo = getXiangmupeizhi("算料单显示CAD板材纹理方向信息", "否") == "是";
  let bancaiwenlifangxiangInfo = "";
  if (showCADBancaiwenlifangxiangInfo) {
    const CADBancaiwenlifangxiang = getDicValue(cadProps, "bancaiwenlifangxiang", "垂直");
    if (CADBancaiwenlifangxiang == "水平") {
      bancaiwenlifangxiangInfo = "横纹";
    }
  }

  const 算料特殊要求 = getDicValue(cadProps, "算料特殊要求", "");

  // 只有一个展开uniqueZhankai的CAD才能这样取，不然只能每个展开单独分开处理
  let needShangxiaqieInfo = materialResult["开启"] == "内开" && !multiZhankai;

  let forceNotDisplayShangxiaqieInfo = false;

  if (getDicValue(自定义属性, "不显示上下切信息", "否") == "是") {
    forceNotDisplayShangxiaqieInfo = true;
  }

  if (forceNotDisplayShangxiaqieInfo) {
    needShangxiaqieInfo = false;
  }

  let menshanshangqieInZhankai = false;
  let menshansxiaqieInZhankai = false;

  for (const zhan of getDicValue(cadProps, "zhankai", [])) {
    if (nameIncludes(getDicValue(zhan, "zhankaigao", ""), "门扇上切")) {
      menshanshangqieInZhankai = true;
    }
    if (nameIncludes(getDicValue(zhan, "zhankaigao", ""), "门扇下切")) {
      menshansxiaqieInZhankai = true;
    }
  }

  const xuyaoshangqie = getDicValue(自定义属性, "需要上切", "否") == "是";
  const xuyaoxiaqie = getDicValue(自定义属性, "需要下切", "否") == "是";
  const xuyaoshangsuoduan = getDicValue(自定义属性, "需要上缩短", "否") == "是";
  const xuyaoxiasuoduan = getDicValue(自定义属性, "需要下缩短", "否") == "是";

  const needShangqieInfo = needShangxiaqieInfo && (xuyaoshangqie || xuyaoshangsuoduan || menshanshangqieInZhankai);
  const needXiaqieInfo = needShangxiaqieInfo && (xuyaoxiaqie || xuyaoxiasuoduan || menshansxiaqieInZhankai);
  // needShangqieInfo = true
  // needXiaqieInfo = true
  const menshanshangqie = materialResult["门扇上切"];
  const menshanxiaqie = materialResult["门扇下切"];
  const hasShangqie = menshanshangqie && menshanshangqie != "0";
  let hasXiaqie = menshanxiaqie && menshanxiaqie != "0";
  let shangqieInfo = getXiangmupeizhi("算料单上切信息", "上缩短#门扇上切#");
  if (项目名 != "sd" && 项目名 != "sd2" && xuyaoshangqie) {
    shangqieInfo = "上切#门扇上切#";
  }
  if (项目名 != "sd" && 项目名 != "sd2" && xuyaoshangsuoduan) {
    shangqieInfo = "上缩短#门扇上切#";
  }
  let xiaqieInfo = getXiangmupeizhi("算料单下切信息", "下缩短#门扇下切#");
  if (项目名 != "sd" && 项目名 != "sd2" && xuyaoxiaqie) {
    xiaqieInfo = "下切#门扇下切#";
  }
  if (项目名 != "sd" && 项目名 != "sd2" && xuyaoxiasuoduan) {
    xiaqieInfo = "下缩短#门扇下切#";
  }
  if (needXiaqieInfo && !hasXiaqie) {
    hasXiaqie = true;
    xiaqieInfo = "下不缩短";
    if (项目名 != "sd" && 项目名 != "sd2" && xuyaoxiaqie) {
      xiaqieInfo = "下不切";
    }
    if (项目名 != "sd" && 项目名 != "sd2" && xuyaoxiasuoduan) {
      xiaqieInfo = "下不缩短";
    }
  }
  const shangxiaqieOnullLine = getXiangmupeizhi("算料单上下切信息显示为一行", "否") == "是";
  shangqieInfo = renderText(shangqieInfo, {}, null, unresolver);
  xiaqieInfo = renderText(xiaqieInfo, {}, null, unresolver);
  if (nameIncludes("分体企料", name)) {
    // needShangqieInfo = true
    // needXiaqieInfo = true
    // hasShangqie = true
    // hasXiaqie = true
    sekaText = "";
    needSeka = true;
  }
  let shangxiaqieCombineInfo = "";
  if (shangxiaqieOnullLine) {
    const combineInfo = [];
    if (needShangqieInfo && hasShangqie) {
      combineInfo.push(shangqieInfo);
    }
    if (needXiaqieInfo && hasXiaqie) {
      combineInfo.push(xiaqieInfo);
    }
    if (combineInfo.length) {
      // 上下切信息是拼接在板材信息里的，当不需要显示板材信息时，但有上下切信息时要重新显示
      if (sameWithMenshanbancai) {
        sekaText = "" + paokengInfo;
        suanliaodanNeedBancai = true;
        needSeka = true;
      }
      shangxiaqieCombineInfo = combineInfo.join(",");
      sekaText += "\n" + shangxiaqieCombineInfo;
    }
  } else {
    if (needShangqieInfo && hasShangqie) {
      shangxiaqieCombineInfo += "\n" + shangqieInfo;
    }
    if (needXiaqieInfo && hasXiaqie) {
      shangxiaqieCombineInfo += "\n" + xiaqieInfo;
    }
    shangxiaqieCombineInfo = lstrip(shangxiaqieCombineInfo);
    if (shangxiaqieCombineInfo != "") {
      // 上下切信息是拼接在板材信息里的，当不需要显示板材信息时，但有上下切信息时要重新显示
      if (sameWithMenshanbancai) {
        sekaText = "" + paokengInfo;
        suanliaodanNeedBancai = true;
        needSeka = true;
      }
    }
    sekaText += "\n" + shangxiaqieCombineInfo;
  }

  sekaText = strip(sekaText, "\n");

  if (paokengInfo != "" && paokengInfoOnullLine) {
    sekaText = "\n" + sekaText;
  }

  let combineText = "";

  let val = "";

  if (显示展开 && (needSuanliao || needSeka)) {
    val = "";
    if (nameIncludes("双包边", name) && getDicValue(cadProps, "zhankaiArr", "")) {
    } else {
      let firstZhankai: any = null;
      let calcW = "";
      let calcH = "";
      let shangzhe = "";
      let xiazhe = "";
      let shuliang = "";
      let isDefaultZhankaikuan = false;
      if (uniqueZhankai.length > 0) {
        firstZhankai = uniqueZhankai.shift();
        zhankaiName = Cast2String(firstZhankai[0]);
        calcW = Cast2String(firstZhankai[1]);
        calcH = Cast2String(firstZhankai[2]);
        shuliang = Cast2String(firstZhankai[3]);
        isDefaultZhankaikuan = firstZhankai[6];
        shangzhe = firstZhankai[7];
        xiazhe = firstZhankai[8];
      }
      if (calcW == "0") {
        calcW = "";
      }
      let shuangxiangzhewanfujiazhiInfo = "";
      if (shangzhe || xiazhe) {
        shuangxiangzhewanfujiazhiInfo = "+" + toFixed(Cast2Number(shangzhe || 0) + Cast2Number(xiazhe || 0), 2);
      }

      if (!suanliaodanNeedZhankaikuan) {
        calcW = "";
      }
      if (!suanliaodanNeedZhankaigao) {
        calcH = "";
      }
      if (suanliaodanqiangzhibuxianshizhankaikuan) {
        calcW = "  ";
      }
      if (isDefaultZhankaikuan && hideDefaultZhankaikuan) {
        calcW = "  ";
      }

      if (getDicValue(cadProps, "overrideShuliang", "") != "") {
        shuliang = Cast2String(Cast2Number(shuliang || "0") * Cast2Number(getDicValue(cadProps, "overrideShuliang", "")));
      }
      if (suanliaodanNeedName) {
        if (!zhankaiName) {
          // 没有展开名字就显示CAD名字
          zhankaiName = name;
        }
        // 如果CAD有显示名字且显示在展开最后一行，就优先使用显示名字
        if (showCADNameAtLastLine && getDicValue(cadProps, "xianshimingzi", "")) {
          zhankaiName = getDicValue(cadProps, "xianshimingzi", "");
        }
        if (!needSuanliaoNameOnly) {
          zhankaiName = zhankaiName + ":";
        }
      } else {
        zhankaiName = "";
      }
      if (needSuanliaoNameOnly) {
        val = zhankaiName;
      } else {
        if (suanliaodanDisplayZhankaigaoFirst) {
          val =
            (showCADNameBeforeZhankai ? zhankaiName : "") +
            calcH +
            shuangxiangzhewanfujiazhiInfo +
            zhankailianjiefu +
            calcW +
            "=" +
            Cast2String(shuliang);
        } else {
          val =
            (showCADNameBeforeZhankai ? zhankaiName : "") +
            calcW +
            zhankailianjiefu +
            calcH +
            shuangxiangzhewanfujiazhiInfo +
            "=" +
            Cast2String(shuliang);
        }

        if (bancaiwenlifangxiangInfo) {
          val += "  " + bancaiwenlifangxiangInfo;
        }

        let info = getZhankaiShangxiaqieInfo(firstZhankai);
        if (forceNotDisplayShangxiaqieInfo) {
          info = "";
        }
        if (info != "" && !sekaText.includes(info)) {
          val += "\n" + info;
        }
      }
      val = trimUnnecessaryZero(val, zhankailianjiefu);
      if (uniqueZhankai.length != 0) {
        for (const aZhankai of uniqueZhankai) {
          let w = Cast2String(aZhankai[1]);
          let h = Cast2String(aZhankai[2]);
          const shangzhe = aZhankai[7];
          const xiazhe = aZhankai[8];
          let shuangxiangzhewanfujiazhiInfo = "";
          if (shangzhe || xiazhe) {
            shuangxiangzhewanfujiazhiInfo = "+" + toFixed(Cast2Number(shangzhe || 0) + Cast2Number(xiazhe || 0), 2);
          }

          if (!suanliaodanNeedZhankaikuan) {
            w = "";
          }
          if (!suanliaodanNeedZhankaigao) {
            h = "";
          }
          if (suanliaodanqiangzhibuxianshizhankaikuan) {
            w = "  ";
          }
          if (aZhankai[6] && hideDefaultZhankaikuan) {
            w = "  ";
          }
          zhankaiName = aZhankai[0];
          let addText = "";
          if (suanliaodanNeedName) {
            if (!zhankaiName) {
              // 没有展开名字就显示CAD名字
              zhankaiName = name;
            }
            // 如果CAD有显示名字且显示在展开最后一行，就优先使用显示名字
            if (showCADNameAtLastLine && getDicValue(cadProps, "xianshimingzi", "")) {
              zhankaiName = getDicValue(cadProps, "xianshimingzi", "");
            }
            if (!needSuanliaoNameOnly) {
              zhankaiName = zhankaiName + ":";
            }
          } else {
            zhankaiName = "";
          }
          if (needSuanliaoNameOnly) {
            addText = zhankaiName;
          } else {
            if (suanliaodanDisplayZhankaigaoFirst) {
              addText =
                (showCADNameBeforeZhankai ? zhankaiName : "") +
                h +
                shuangxiangzhewanfujiazhiInfo +
                zhankailianjiefu +
                w +
                "=" +
                Cast2String(aZhankai[3]);
            } else {
              addText =
                (showCADNameBeforeZhankai ? zhankaiName : "") +
                w +
                zhankailianjiefu +
                h +
                shuangxiangzhewanfujiazhiInfo +
                "=" +
                Cast2String(aZhankai[3]);
            }
            let info = getZhankaiShangxiaqieInfo(aZhankai);
            if (forceNotDisplayShangxiaqieInfo) {
              info = "";
            }
            if (multiZhankai && info != "") {
              addText += "\n" + info;
            }
          }
          addText = trimUnnecessaryZero(addText, zhankailianjiefu);
          if (addText == "") {
            continue;
          }
          val += "\n" + addText;
        }
      }

      if (isZaban && showZaban && suanliaodanNeedBancai) {
        val += seka;
        if (shangxiaqieCombineInfo) {
          val += "\n" + shangxiaqieCombineInfo;
        }
      }
      if (hasPaokeng && !needSeka) {
        val += paokengInfo;
      }
    }

    if (nameIncludes("底框", name) && !isAssembly) {
      if (!hasDikuang2 || !nameIncludes(name, "内")) {
        const dikuangxiamenkuangjiachang = renderText("#地框下门框加长#", {}, null, unresolver);
        if (dikuangxiamenkuangjiachang && dikuangxiamenkuangjiachang != "0") {
          val += "\n" + "地框下门框加长" + dikuangxiamenkuangjiachang + "mm";
        }
      }
    }

    if (needSuanliao) {
      combineText = val;
    }
  }

  // 色卡
  if (显示展开 && needSeka && !isZaban && seka != "" && seka != "无") {
    if (seka != "" || hasPaokeng) {
      // 刨坑加上下切的时候，刨坑信息不换行
      let ln = "";
      if (combineText != "") {
        ln = "\n";
        if (needPaokeng && shangxiaqieCombineInfo != "" && strip(sekaText).startsWith("刨坑")) {
          ln = "";
        }
        if (paokengInfoAfterZhankai) {
          ln = "";
        }
      }
      combineText += ln + sekaText;
    }
  }

  if (needKuanZhunque) {
    combineText += "\n         要求";
  }
  if (needGaoZhunque) {
    combineText += "\n         要求";
  }
  if (needBaobianyanchang) {
    combineText += "\n包边延长：" + baobianyanchang;
  }

  combineText = trimUnnecessaryZero(combineText, zhankailianjiefu);
  combineText = combineText.replaceAll(/\\n+/g, "\n");
  combineText = combineText.replaceAll("\n" + paokengInfoPrefix, "\n");

  if (combineText != "" || 算料特殊要求 != "") {
    // combineText = DXFDocument.FormatLengthText(combineText)
    if (showCADNameAtLastLine) {
      zhankaiName = zhankaiName.replace(/\:$/, "");
      if (zhankaiName != "") {
        combineText += "\n" + zhankaiName;
      }
    }

    if (算料特殊要求) {
      if (combineText) {
        combineText += "\n";
      }
      combineText += renderText(算料特殊要求, {}, null, unresolver);
    }
  }

  return combineText;
};

export const nameEquals = <T = string>(name: T, equals: T | T[] | Dictionary<T[]>, caseInensitive?: boolean): T | null => {
  if (!name || !equals) {
    return null;
  }
  if (typeof equals == "string") {
    equals = [equals];
  }
  let mapping: Dictionary<T[]> = Array.isArray(equals) ? null : <any>equals;
  if (!mapping) {
    mapping = {};
    (<string[]>(<any[]>equals)).forEach((inc) => {
      mapping[inc] = [<T>(<any>inc)];
    });
  }
  for (const inc in mapping) {
    if (mapping.hasOwnProperty(inc)) {
      let names: string[] = <string[]>(<any[]>mapping[inc]);
      if (caseInensitive) {
        names = names.map((k) => (<string>k).toLowerCase());
      }
      const search = caseInensitive ? (<string>(<any>name)).toLowerCase() : name;
      if (names.find((k) => search === k) != null) {
        return <T>(<any>inc);
      }
    }
  }
  return null;
};

export const nameIncludes = <T = string>(name: T, includes: T | T[] | Dictionary<T[]>, caseInensitive?: boolean): T | null => {
  if (!name || !includes) {
    return null;
  }
  if (typeof includes == "string") {
    includes = [includes];
  }
  let mapping: Dictionary<T[]> = Array.isArray(includes) ? null : <any>includes;
  if (!mapping) {
    mapping = {};
    (<string[]>(<any[]>includes)).forEach((inc) => {
      mapping[inc] = [<T>(<any>inc)];
    });
  }
  for (const inc in mapping) {
    if (mapping.hasOwnProperty(inc)) {
      let names: string[] = <string[]>(<any[]>mapping[inc]);
      if (caseInensitive) {
        names = names.map((k) => (<string>(<any>k)).toLowerCase());
      }
      const search = caseInensitive ? (<string>(<any>name)).toLowerCase() : <string>(<any>name);
      if (names.find((k) => search.includes(k)) != null) {
        return <T>(<any>inc);
      }
    }
  }
  return null;
};
