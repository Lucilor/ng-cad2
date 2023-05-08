import {Component, OnInit} from "@angular/core";
import {setGlobal} from "@app/app.common";
import {CadInfo, CadPortable, PeiheInfo, Slgs, SlgsInfo, SourceCadMap, XinghaoInfo} from "@app/cad.portable";
import {isShiyitu, reservedDimNames, validateLines} from "@app/cad.utils";
import {CadData, CadDimensionLinear, CadLayer, CadLineLike, CadMtext} from "@cad-viewer";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {environment} from "@env";
import {Utils} from "@mixins/utils.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {downloadByString, ObjectOf, ProgressBar} from "@utils";
import {difference} from "lodash";
import md5 from "md5";

export type ImportComponentConfigName = "requireLineId" | "pruneLines" | "addUniqCode" | "dryRun";
export type ImportComponentConfig = Record<ImportComponentConfigName, {label: string; value: boolean | null}>;

@Component({
  selector: "app-import",
  templateUrl: "./import.component.html",
  styleUrls: ["./import.component.scss"]
})
export class ImportComponent extends Utils() implements OnInit {
  private _cadNameRegex = /^(?!\d)[\da-zA-Z\u4e00-\u9fa5_]*$/u;
  private _optionsCache: ObjectOf<string[]> = {};
  // private _peiheCadCache: ObjectOf<boolean> = {};
  private _sourceFile: File | null = null;
  private _sourceCadMap: SourceCadMap = {cads: {}, slgses: {}};
  private _errorMsgLayer = "导入错误信息";
  sourceCad: CadData | null = null;
  batchCheckData: ObjectOf<any>[] | null = null;

  loaderIds = {
    importLoader: "importLoader",
    reimportLoader: "reimportLoader",
    importSuanliaoLoader: "importSuanliaoLoader",
    reimportSuanliaoLoader: "reimportSuanliaoLoader",
    downloadSourceCad: "downloadSourceCad"
  };
  msg = "";
  cads: CadInfo[] = [];
  slgses: SlgsInfo[] = [];
  xinghaoInfo: XinghaoInfo | undefined;
  cadsParsed = false;
  hasError = false;
  isImporting = false;
  progressBar = new ProgressBar(0);
  progressBarStatus: ProgressBarStatus = "hidden";
  importConfigNormal: ImportComponentConfig = {
    requireLineId: {label: "上传线必须全部带ID", value: null},
    pruneLines: {label: "后台线在上传数据中没有时删除", value: null},
    addUniqCode: {label: "没有唯一码生成新CAD数据", value: false},
    dryRun: {label: "仅检查数据，不导入", value: false}
  };
  importConfigSuanliao: ImportComponentConfig = {
    requireLineId: {label: "上传线必须全部带ID", value: false},
    pruneLines: {label: "后台线在上传数据中没有时删除", value: true},
    addUniqCode: {label: "没有唯一码生成新CAD数据", value: true},
    dryRun: {label: "仅检查数据，不导入", value: false}
  };
  maxLineLength = 200;
  导入dxf文件时展开名字不改变 = false;

  constructor(
    private dataService: CadDataService,
    private message: MessageService,
    private spinner: SpinnerService,
    private status: AppStatusService
  ) {
    super();
    setGlobal("importer", this);
  }

  async ngOnInit() {
    if (!environment.production) {
      this.importConfigNormal.requireLineId.value = false;
      this.importConfigNormal.pruneLines.value = true;
    }
    this.keysOf(this.importConfigSuanliao);
  }

  private _getImportConfig(isXinghao: boolean) {
    return isXinghao ? this.importConfigSuanliao : this.importConfigNormal;
  }

  private _getImportConfigValues(isXinghao: boolean) {
    const config = this._getImportConfig(isXinghao);
    const values: ObjectOf<boolean> = {};
    Object.keys(config).forEach((key) => {
      values[key] = !!config[key as keyof ImportComponentConfig].value;
    });
    return values as Record<ImportComponentConfigName, boolean>;
  }

  canSubmit(isXinghao: boolean) {
    if (this.isImporting) {
      return false;
    }
    const {requireLineId, pruneLines} = this._getImportConfig(isXinghao);
    return requireLineId.value !== null && pruneLines.value !== null;
  }

  async importDxf(event: Event | null, isXinghao: boolean, loaderId: string): Promise<boolean> {
    let el: HTMLInputElement | undefined;
    const finish = (hasLoader: boolean, progressBarStatus: ProgressBarStatus, msg?: string) => {
      if (hasLoader) {
        this.spinner.hide(loaderId);
      }
      this.progressBar.end();
      this.progressBarStatus = progressBarStatus;
      this.msg = typeof msg === "string" ? msg : "";
      if (el) {
        el.value = "";
      }
      this.isImporting = false;
      return progressBarStatus === "success";
    };
    if (event) {
      el = event.target as HTMLInputElement;
      if (!el.files || el.files.length < 1) {
        return finish(false, "hidden");
      }
      this._sourceFile = el.files[0];
    } else if (!this._sourceFile) {
      return false;
    }
    this.isImporting = true;
    this.progressBar.start(1);
    this.progressBarStatus = "progress";
    this.msg = "正在获取数据";
    this.spinner.show(loaderId);
    const 导入dxf文件时展开名字不改变 = this.status.getProjectConfigBoolean("导入dxf文件时展开名字不改变");
    const data = await this.dataService.uploadDxf(this._sourceFile);
    if (!data) {
      return finish(true, "error", "读取文件失败");
    }
    this.sourceCad = data;
    const removedDimensions = data.info.removedDimensions;
    let errorMsgLayer = data.layers.find((v) => v.name === this._errorMsgLayer);
    if (!errorMsgLayer) {
      errorMsgLayer = new CadLayer();
      errorMsgLayer.name = this._errorMsgLayer;
      data.layers.push(errorMsgLayer);
    }
    data.entities.toArray().forEach((e) => {
      if (e.layer === this._errorMsgLayer) {
        data.entities.remove(e);
      }
    });
    const maxLineLength = isXinghao ? this.maxLineLength : 0;
    const {cads, slgses, sourceCadMap, xinghaoInfo} = CadPortable.import({sourceCad: data, maxLineLength, 导入dxf文件时展开名字不改变});

    const hasEmptyCad = cads.length < 1 || cads.some((cad) => cad.data.entities.length < 1);
    if (hasEmptyCad) {
      this.message.alert({title: "dxf识别错误", content: "可能原因：<br>cad使用了绿色线<br>数据为空<br>绿色框不封闭"});
      return finish(true, "error");
    }

    if (isXinghao) {
      if (!sourceCadMap.xinghao) {
        this.message.alert("导入文件为非型号文件，请使用左侧按钮。");
        return finish(true, "error", "点错了?");
      }
      const xinghaos = Array.from(new Set(cads.map((v) => v.data.options.型号).filter((v) => v)));
      if (xinghaos.length < 1) {
        return finish(true, "error", "没写型号");
      } else if (xinghaos.length > 1) {
        return finish(true, "error", "型号不一致");
      }
      const xinghao = xinghaos[0];
      const isXinghaoDoneRes = await this.dataService.post<boolean>("ngcad/isXinghaoDone", {xinghao});
      if (isXinghaoDoneRes?.data === true) {
        this.message.alert("型号已经检查完成，不允许导入。如果需要导入，请先设置型号进度为否。");
        return finish(true, "error", "型号已经检查完成");
      }
    } else {
      if (sourceCadMap.xinghao) {
        this.message.alert("导入文件为型号文件，请使用右侧按钮。");
        return finish(true, "error", "点错了?");
      }
    }
    if (Array.isArray(removedDimensions)) {
      removedDimensions.forEach((v) => {
        data.entities.dimension.push(new CadDimensionLinear(v));
      });
    }
    this._sourceCadMap = sourceCadMap;
    const totalCad = cads.length;
    const totalSlgs = slgses.length;
    let totalSteps = (totalCad + totalSlgs) * 2;
    if (isXinghao) {
      totalSteps++;
      if (xinghaoInfo) {
        totalSteps++;
      }
    }
    this.progressBar.start(totalSteps);
    this.msg = "正在检查数据";
    await this.parseCads(cads, slgses, isXinghao, xinghaoInfo);
    if (this.hasError) {
      return finish(true, "error", "数据有误");
    }

    const {pruneLines, dryRun} = this._getImportConfigValues(isXinghao);
    if (dryRun) {
      return finish(true, "success", `检查结束`);
    }
    let skipped = 0;
    if (isXinghao) {
      const xinghao = cads[0].data.options.型号;
      const uniqCodes = cads.map((v) => v.data.info.唯一码);
      const oldCadsRaw = await this.dataService.queryMongodb({
        collection: "cad",
        where: {"选项.型号": xinghao, 分类: "算料", 名字: {$regex: "^((?!分体|上下包边).)*$"}}
      });
      const oldSlgsRaw = await this.dataService.queryMongodb({collection: "material", where: {"选项.型号": xinghao}});
      const toDelete = {cad: [] as string[], material: [] as string[]};
      oldCadsRaw.forEach((v) => {
        if (!uniqCodes.includes(v.json?.info?.唯一码)) {
          toDelete.cad.push(v._id);
        }
      });
      oldSlgsRaw.forEach((v) => {
        toDelete.material.push(v._id);
      });
      // if (toDelete.cad.length > 0) {
      //     this.msg = "正在删除多余的cad";
      //     await this.dataService.removeCads("cad", toDelete.cad, {silent: true});
      // }
      if (toDelete.material.length > 0) {
        this.msg = "正在删除旧的算料公式";
        await this.dataService.removeCads("material", toDelete.material, {silent: true});
      }
    }
    for (let i = 0; i < totalCad; i++) {
      const result = await this.dataService.setCad(
        {
          collection: "cad",
          cadData: cads[i].data,
          force: true,
          importConfig: {pruneLines}
        },
        {silent: true}
      );
      this.msg = `正在导入dxf数据(${i + 1}/${totalCad})`;
      if (!result) {
        skipped++;
        this.cads[i].errors.push(this.dataService.lastResponse?.msg || "保存失败");
      }
      this.progressBar.forward();
    }
    for (let i = 0; i < totalSlgs; i++) {
      const response = await this.dataService.post("ngcad/updateSuanliaogonshi", {data: this.slgses[i].data}, {silent: true});
      this.msg = `正在导入算料公式(${i + 1}/${totalSlgs})`;
      if (!this.dataService.getResponseData(response)) {
        skipped++;
        this.slgses[i].errors.push(this.dataService.lastResponse?.msg || "保存失败");
      }
      this.progressBar.forward();
    }

    this.msg = `正在保存dxf文件`;
    if (isXinghao) {
      const xinghao = this.cads[0].data.options.型号;
      const result = await this.dataService.post<boolean>("ngcad/setImportDxf", {file: this._sourceFile, xinghao});
      if (!result) {
        return finish(true, "error", this.dataService.lastResponse?.msg || "保存失败");
      }
    }
    const total = totalCad + totalSlgs;
    return finish(true, "success", `导入结束, ${total - skipped}个成功(共${total}个)`);
  }

  private _getCadMd5(cad: CadData) {
    const options: [string, string[]][] = [];
    const optionKeys = Object.keys(cad.options).sort();
    optionKeys.forEach((key) => {
      options.push([key, CadPortable.splitOptionValue(cad.options[key]).sort()]);
    });
    return md5(
      JSON.stringify({
        name: cad.name,
        type: cad.type,
        type2: cad.type2,
        conditions: cad.conditions.sort(),
        options
      })
    );
  }

  private _getSlgsMd5(slgs: Slgs) {
    const options: [string, string[]][] = [];
    const optionKeys = Object.keys(slgs.选项).sort();
    optionKeys.forEach((key) => {
      options.push([key, CadPortable.splitOptionValue(slgs.选项[key]).sort()]);
    });
    if (Array.isArray(slgs.条件)) {
      slgs.条件.sort();
    }
    return md5(
      JSON.stringify({
        type: slgs.分类,
        conditions: slgs.条件,
        options
      })
    );
  }

  private _clearCache() {
    this._optionsCache = {};
    this._peiheCadCache = {};
  }

  async parseCads(cads: CadInfo[], slgses: SlgsInfo[], isXinghao: boolean, xinghaoInfo?: XinghaoInfo) {
    this.cadsParsed = false;
    this.hasError = false;
    this._clearCache();
    const uniqCodesCount: ObjectOf<number> = {};
    const {requireLineId, addUniqCode} = this._getImportConfigValues(isXinghao);
    for (const v of cads) {
      let uniqCode = v.data.info.唯一码;
      if (!uniqCode) {
        if (addUniqCode) {
          if (isXinghao) {
            v.data.info.唯一码 = CadPortable.getUniqCode(v.data);
          } else {
            const response = await this.dataService.post<string>("ngcad/generateUniqCode", {
              uniqCode: CadPortable.getUniqCode(v.data)
            });
            const 唯一码 = this.dataService.getResponseData(response);
            if (唯一码) {
              v.data.info.唯一码 = 唯一码;
            } else {
              v.errors.push("无法生成唯一码");
            }
          }
          uniqCode = v.data.info.唯一码;
        }
      }
      if (!uniqCode) {
        continue;
      }
      if (uniqCodesCount[uniqCode] === undefined) {
        uniqCodesCount[uniqCode] = 1;
      } else {
        uniqCodesCount[uniqCode]++;
      }
    }

    this.cads = cads;
    this.slgses = slgses;
    this.xinghaoInfo = xinghaoInfo;

    const cadMd5Map: ObjectOf<CadInfo[]> = {};
    cads.forEach((cad) => {
      const md5Str = this._getCadMd5(cad.data);
      if (cadMd5Map[md5Str]) {
        cadMd5Map[md5Str].push(cad);
      } else {
        cadMd5Map[md5Str] = [cad];
      }
    });
    for (const md5Str in cadMd5Map) {
      if (cadMd5Map[md5Str].length > 1) {
        this.hasError = true;
        const uniqCodes = cadMd5Map[md5Str].map((v) => v.data.info.唯一码);
        cadMd5Map[md5Str].forEach((cad) => {
          cad.errors.push(`数据重复: ${uniqCodes.filter((v) => v !== cad.data.info.唯一码).join(", ")}`);
        });
      }
    }
    const slgsMd5Map: ObjectOf<SlgsInfo[]> = {};
    slgses.forEach((slgs) => {
      const md5Str = this._getSlgsMd5(slgs.data);
      if (slgsMd5Map[md5Str]) {
        slgsMd5Map[md5Str].push(slgs);
      } else {
        slgsMd5Map[md5Str] = [slgs];
      }
    });
    for (const md5Str in slgsMd5Map) {
      if (slgsMd5Map[md5Str].length > 1) {
        this.hasError = true;
        slgsMd5Map[md5Str].forEach((slgs) => {
          slgs.errors.push("算料公式重复");
        });
      }
    }

    const totalCad = cads.length;
    const totalSlgs = slgses.length;
    for (let i = 0; i < totalCad; i++) {
      this.msg = `正在检查dxf数据(${i + 1}/${totalCad})`;
      this.progressBar.forward();
      await this._validateCad(cads[i], uniqCodesCount, requireLineId);
    }
    for (let i = 0; i < totalSlgs; i++) {
      this.msg = `正在检查算料公式数据(${i + 1}/${totalSlgs})`;
      this.progressBar.forward();
      await this._validateSlgs(slgses[i]);
    }

    const data = this.cads.map((v) => {
      const json = v.data.export();
      json.选项 = json.options;
      json.条件 = json.conditions;
      return {
        json,
        _id: json.id,
        选项: json.options,
        条件: json.conditions,
        名字: json.name,
        显示名字: json.xianshimingzi,
        分类: json.type,
        分类2: json.type2
      };
    });
    try {
      this.batchCheckData = data;
      const checkResult = window.batchCheck(data);
      this.cads.forEach((cad) => {
        const errors = checkResult[cad.data.id];
        if (errors && errors.length > 0) {
          cad.errors = cad.errors.concat(errors);
        }
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        this.message.alert(error.message);
      }
    }

    if (xinghaoInfo) {
      this.msg = `正在检查型号配置`;
      this.progressBar.forward();
      if (xinghaoInfo.errors.length > 0) {
        this.hasError = true;
      }
    }

    this.cadsParsed = true;
  }

  private async _validateOptions(options: ObjectOf<string>) {
    const errors: string[] = [];
    for (const optionKey in options) {
      const optionValues = CadPortable.splitOptionValue(options[optionKey]);
      const tmpVals: string[] = [];
      const duplicateValues: string[] = [];
      optionValues.forEach((v) => {
        if (tmpVals.includes(v)) {
          duplicateValues.push(v);
        } else {
          tmpVals.push(v);
        }
      });
      if (duplicateValues.length > 0) {
        errors.push(`选项[${optionKey}]重复: ${duplicateValues.join(", ")}`);
      }
      if (this._optionsCache[optionKey] === undefined) {
        const optionInfo = await this.dataService.getOptions({name: optionKey});
        this._optionsCache[optionKey] = optionInfo.data.map((v) => v.name);
      }
      const optionsNotExist = difference(optionValues, this._optionsCache[optionKey], ["所有", "不选", "不选无"]);
      if (optionsNotExist.length > 0) {
        errors.push(`选项[${optionKey}]不存在或已停用: ${optionsNotExist.join(", ")}`);
      }
    }
    return errors;
  }

  private async _validateCad(cad: CadInfo, uniqCodesCount: ObjectOf<number>, requireLineId: boolean) {
    if (cad.data.info.isEmpty) {
      cad.errors = cad.data.info.errors;
      return;
    }
    const data = cad.data;

    if (Array.isArray(data.info.errors)) {
      cad.errors = cad.errors.concat(data.info.errors);
      delete data.info.errors;
    }

    const uniqCode = data.info.唯一码;
    if (!uniqCode) {
      cad.errors.push("没有唯一码");
    } else if (uniqCodesCount[uniqCode] > 1) {
      cad.errors.push("唯一码重复: " + uniqCode);
    }
    if (!data.type && !cad.skipErrorCheck.has("分类")) {
      cad.errors.push("没有分类");
    }
    CadPortable.addLineId(data);

    data.name = data.name.replaceAll("-", "_");
    if (data.name.match(/^\d+/)) {
      data.name = "_" + data.name;
    } else if (!data.name.match(this._cadNameRegex) && !cad.skipErrorCheck.has("名字")) {
      cad.errors.push("CAD名字只能是：中文、英文字母、数字、下划线");
    }
    let 修改包边正面宽规则 = data.info.修改包边正面宽规则;
    if (data.type === "包边正面") {
      if (修改包边正面宽规则) {
        修改包边正面宽规则 = "修改包边正面宽规则:\n" + 修改包边正面宽规则;
        cad.errors = cad.errors.concat(window.parseBaobianzhengmianRules(修改包边正面宽规则, data.info.vars).errors);
      }
    } else if (修改包边正面宽规则) {
      cad.errors.push("分类不为[包边正面]不能写[修改包边正面宽规则]");
    }
    if (data.info.锁边自动绑定可搭配铰边 && !data.type.match(/锁企料|扇锁企料/)) {
      cad.errors.push("分类不为[锁企料]或[扇锁企料]不能有[锁边自动绑定可搭配铰边]");
    }
    if (data.kailiaoshibaokeng && data.zhidingweizhipaokeng.length > 0) {
      cad.errors.push("不能同时设置[全部刨坑]和[指定位置刨坑]");
    }
    const entities = data.getAllEntities();
    if (requireLineId) {
      const lines = entities.filter((v) => v instanceof CadLineLike).toArray() as CadLineLike[];
      if (lines.some((v) => !v.线id)) {
        cad.errors.push("存在没有id的线");
      }
    }
    cad.errors = cad.errors.concat(validateLines(data).errors);
    cad.errors = cad.errors.concat(await this._validateOptions(data.options));
    cad.errors = cad.errors.concat(await this._validateOptions(data.对应计算条数的配件));

    const infoObj: ObjectOf<PeiheInfo[]> = {
      锁企料: [
        "锁框",
        "顶框"
        // "中锁料",
      ],
      扇锁企料: [{type: "小锁料", options: {isNot: {产品分类: ["单门", "", undefined, null]}}}]
      // 铰企料: ["中铰料"]
    };
    CadPortable.splitOptionValue(data.info.锁边自动绑定可搭配铰边).forEach((v) => {
      infoObj.锁企料.push({type: "铰企料", options: {is: {铰边: v}}, hint: v});
    });
    let infoArray: PeiheInfo[] | undefined;
    const types = CadPortable.getTypes(data);
    for (const type of types) {
      if (infoObj[type]) {
        infoArray = infoObj[type];
        break;
      }
    }
    if (infoArray !== undefined) {
      const infoArray2: PeiheInfo[] = [];
      for (const info of infoArray) {
        const dataArr = this.cads.map((v) => v.data);
        const {value} = CadPortable.hasPeiheCad(dataArr, info, data.options);
        if (!value) {
          infoArray2.push(info);
        }
      }
      const result = await this._matchPeiheCad(infoArray2, data.options);
      result.forEach((matched, i) => {
        const info = infoArray2[i];
        if (!matched) {
          if (typeof info === "string") {
            cad.errors.push(`缺少对应${info}`);
          } else {
            let error = `缺少对应${info.type}`;
            if (info.hint) {
              error += `: ${info.hint}`;
            }
            cad.errors.push(error);
          }
        }
      });
    }

    if (this.slgses.length > 0) {
      const optionKeys = ["型号", "产品分类"];
      optionKeys.forEach((key) => {
        if (!data.options[key]) {
          cad.errors.push(`缺少选项: ${key}`);
        }
      });
    }

    data.entities.dimension.forEach((e) => {
      if (e instanceof CadDimensionLinear) {
        if (reservedDimNames.includes(e.mingzi)) {
          cad.errors.push(`标注名字不能是: ${e.mingzi}`);
        }
        if (isShiyitu(data)) {
          if (e.mingzi.includes("=")) {
            cad.errors.push("示意图标注不能有=号");
          } else if (!e.mingzi.includes("显示公式")) {
            e.mingzi = "显示公式: " + e.mingzi;
          }
        } else {
          if (e.info.isGongshi) {
            if (!e.mingzi.includes("显示公式")) {
              e.mingzi = "显示公式: " + e.mingzi;
            }
            const id1 = e.entity1.id;
            const id2 = e.entity2.id;
            if (!(id1 && id2)) {
              cad.errors.push(`公式标注[=${e.mingzi}]识别错误, 必须标到两个端点`);
            }
          }
        }
      }
    });
    for (const e of data.entities.line) {
      if (e.gongshi.match(/[,.;，。；]/)) {
        cad.errors.push(`线公式不能包含逗号、句号或分号`);
        break;
      }
    }

    if (cad.errors.length > 0) {
      this.hasError = true;
      if (this.sourceCad) {
        const sourceCadInfo = this._sourceCadMap.cads[data.id];
        const mtext = new CadMtext();
        mtext.text = cad.errors.join("\n");
        mtext.setColor("red");
        mtext.layer = this._errorMsgLayer;
        mtext.insert.set(sourceCadInfo.rect.left, sourceCadInfo.rect.bottom - 10);
        this.sourceCad.entities.add(mtext);
      }
    }
  }

  private async _validateSlgs(slgs: SlgsInfo) {
    const data = slgs.data;
    slgs.errors = slgs.errors.concat(await this._validateOptions(data.选项));
    if (Object.keys(data.公式).length > 0) {
      const strict = this.dataService.strict;
      this.dataService.strict = false;
      const response = await this.dataService.post("ngcad/validateFormulas", {formulas: data.公式}, {silent: true});
      this.dataService.strict = strict;
      if (response?.code !== 0) {
        const msg = response?.msg || "验证算料公式时出错";
        slgs.errors.push(msg);
      }
      for (const key in data.公式) {
        if (key.includes("-")) {
          slgs.errors.push(`算料公式名字不能包含-号: ${key}`);
        }
      }
    } else {
      slgs.errors.push("公式内容为空");
    }

    if (slgs.errors.length > 0) {
      this.hasError = true;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async _matchPeiheCad(infoArray: PeiheInfo[], options: ObjectOf<string>) {
    return infoArray.map(() => true);
    // const result: boolean[] = [];
    // const indice: number[] = [];
    // const cache = this._peiheCadCache;
    // const keys = infoArray.map((info, i) => {
    //   const key = md5(JSON.stringify({info, options}));
    //   if (cache[key] !== undefined) {
    //     result[i] = cache[key];
    //   } else {
    //     result[i] = false;
    //     indice.push(i);
    //   }
    //   return key;
    // });
    // infoArray.forEach((_, i) => {
    //   if (cache[keys[i]] !== undefined) {
    //     result[i] = cache[keys[i]];
    //   } else {
    //     indice.push(i);
    //   }
    // });
    // if (indice.length > 0) {
    //   infoArray = infoArray.filter((_, i) => indice.includes(i));
    //   const response = await this.dataService.post<boolean[]>("peijian/cad/matchPeiheCad", {infoArray, options});
    //   this.dataService.getResponseData(response)?.forEach((matched, i) => {
    //     const j = indice[i];
    //     result[j] = matched;
    //     cache[keys[j]] = matched;
    //   });
    // }
    // return result;
  }

  async downloadSourceCad() {
    if (!this.sourceCad) {
      return;
    }
    this.spinner.show(this.loaderIds.downloadSourceCad);
    await this.dataService.downloadDxf(this.sourceCad);
    this.spinner.hide(this.loaderIds.downloadSourceCad);
  }

  downloadBatchCheckData() {
    let filename: string | undefined;
    if (this._sourceFile) {
      filename = this._sourceFile.name.split(".")[0] + ".json";
    }
    downloadByString(JSON.stringify(this.batchCheckData), {filename});
  }
}
