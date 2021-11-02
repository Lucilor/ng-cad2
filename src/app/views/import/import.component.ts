import {Component, OnInit} from "@angular/core";
import {CadPortable, Slgs} from "@app/cad.portable";
import {isShiyitu, reservedDimNames, validateLines} from "@app/cad.utils";
import {CadData, CadDimension, CadEntities, CadLayer, CadLineLike, CadMtext} from "@cad-viewer";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {environment} from "@env";
import {Utils} from "@mixins/utils.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf, ProgressBar, Rectangle} from "@utils";
import Color from "color";
import {difference, intersection} from "lodash";
import md5 from "md5";
import {NgxUiLoaderService} from "ngx-ui-loader";

export interface ImportComponentCad {
    data: CadData;
    errors: string[];
    skipErrorCheck: Set<string>;
}

export interface ImportComponentSlgs {
    data: Slgs;
    errors: string[];
}

export type ImportComponentConfigName = "requireLineId" | "pruneLines" | "addUniqCode";
export type ImportComponentConfig = Record<ImportComponentConfigName, {label: string; value: boolean | null}>;

interface PeiheInfo {
    type: string;
    options: {
        is?: ObjectOf<string>;
        isNot?: ObjectOf<(string | null | undefined)[]>;
    };
    hint?: string;
}

@Component({
    selector: "app-import",
    templateUrl: "./import.component.html",
    styleUrls: ["./import.component.scss"]
})
export class ImportComponent extends Utils() implements OnInit {
    private _cadNameRegex = /^(?!\d)[\da-zA-Z\u4e00-\u9fa5_]*$/u;
    private _optionsCache: ObjectOf<string[]> = {};
    private _peiheCadCache: ObjectOf<boolean> = {};
    private _sourceCadMap: ObjectOf<{rect: Rectangle; rectLines: CadLineLike[]; entities: CadEntities}> = {};
    private _errorMsgLayer = "导入错误信息";
    sourceCad: CadData | null = null;

    loaderIds = {importLoader: "importLoader", importSuanliaoLoader: "importSuanliaoLoader", downloadSourceCad: "downloadSourceCad"};
    msg = "";
    cads: ImportComponentCad[] = [];
    slgses: ImportComponentSlgs[] = [];
    cadsParsed = false;
    hasError = false;
    progressBar = new ProgressBar(0);
    progressBarStatus: ProgressBarStatus = "hidden";
    importConfigNormal: ImportComponentConfig = {
        requireLineId: {label: "上传线必须全部带ID", value: null},
        pruneLines: {label: "后台线在上传数据中没有时删除", value: null},
        addUniqCode: {label: "没有唯一码生成新CAD数据", value: false}
    };
    importConfigSuanliao: ImportComponentConfig = {
        requireLineId: {label: "上传线必须全部带ID", value: false},
        pruneLines: {label: "后台线在上传数据中没有时删除", value: true},
        addUniqCode: {label: "没有唯一码生成新CAD数据", value: true}
    };

    constructor(private loader: NgxUiLoaderService, private dataService: CadDataService, private message: MessageService) {
        super();
    }

    ngOnInit() {
        if (!environment.production) {
            this.importConfigNormal.requireLineId.value = false;
            this.importConfigNormal.pruneLines.value = true;
        }
    }

    private _getImportConfig(isSuanliao: boolean) {
        return isSuanliao ? this.importConfigSuanliao : this.importConfigNormal;
    }

    canSubmit(isSuanliao: boolean) {
        const {requireLineId, pruneLines} = this._getImportConfig(isSuanliao);
        return requireLineId.value !== null && pruneLines.value !== null;
    }

    async importDxf(event: Event, isSuanliao: boolean) {
        const el = event.target as HTMLInputElement;
        const loaderId = isSuanliao ? this.loaderIds.importSuanliaoLoader : this.loaderIds.importLoader;
        const finish = (hasLoader: boolean, progressBarStatus: ProgressBarStatus, msg?: string) => {
            if (hasLoader) {
                this.loader.stopLoader(loaderId);
            }
            this.progressBar.end();
            this.progressBarStatus = progressBarStatus;
            this.msg = typeof msg === "string" ? msg : "";
            el.value = "";
        };
        if (!el.files?.length) {
            finish(false, "hidden");
            return;
        }
        this.progressBar.start(1);
        this.progressBarStatus = "progress";
        this.msg = "正在获取数据";
        this.loader.startLoader(loaderId);
        const data = await this.dataService.uploadDxf(el.files[0]);
        if (!data) {
            finish(true, "error", "读取文件失败");
            return;
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
        const {cads, slgses, sourceCadMap} = CadPortable.import(data, isSuanliao);
        if (Array.isArray(removedDimensions)) {
            removedDimensions.forEach((v) => {
                data.entities.dimension.push(new CadDimension(v));
            });
        }
        this._sourceCadMap = sourceCadMap;
        const totalCad = cads.length;
        const totalSlgs = slgses.length;
        this.progressBar.start((totalCad + totalSlgs) * 2);
        this.msg = "正在检查数据";
        await this.parseCads(cads, slgses, isSuanliao);
        if (this.hasError) {
            finish(true, "error", "数据有误");
            return;
        }
        let skipped = 0;
        const silent = this.dataService.silent;
        this.dataService.silent = true;
        const pruneLines = this._getImportConfig(isSuanliao).pruneLines.value ?? false;
        for (let i = 0; i < totalCad; i++) {
            const result = await this.dataService.setCad({
                collection: "cad",
                cadData: cads[i].data,
                force: true,
                importConfig: {pruneLines}
            });
            this.msg = `正在导入dxf数据(${i + 1}/${totalCad})`;
            if (!result) {
                skipped++;
                this.cads[i].errors.push(this.dataService.lastResponse?.msg || "保存失败");
            }
            this.progressBar.forward();
        }
        for (let i = 0; i < totalSlgs; i++) {
            const response = await this.dataService.post("ngcad/updateSuanliaogonshi", {data: this.slgses[i].data});
            this.msg = `正在导入算料公式(${i + 1}/${totalSlgs})`;
            if (!response?.data) {
                skipped++;
                this.slgses[i].errors.push(this.dataService.lastResponse?.msg || "保存失败");
            }
            this.progressBar.forward();
        }
        this.dataService.silent = silent;
        const total = totalCad + totalSlgs;
        finish(true, "success", `导入结束, ${total - skipped}个成功(共${total}个)`);
    }

    private _getMd5(cad: CadData) {
        const options: [string, string[]][] = [];
        const optionKeys = Object.keys(cad.options).sort();
        optionKeys.forEach((key) => {
            options.push([key, cad.options[key].split(";").sort()]);
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

    private _clearCache() {
        this._optionsCache = {};
        this._peiheCadCache = {};
    }

    async parseCads(cads: ImportComponentCad[], slgses: ImportComponentSlgs[], isSuanliao: boolean) {
        this.cadsParsed = false;
        this.hasError = false;
        this._clearCache();
        const uniqCodesCount: ObjectOf<number> = {};
        cads.forEach((v) => {
            const uniqCode = v.data.info.唯一码;
            if (!uniqCode) {
                return;
            }
            if (uniqCodesCount[uniqCode] === undefined) {
                uniqCodesCount[uniqCode] = 1;
            } else {
                uniqCodesCount[uniqCode]++;
            }
        });

        this.cads = cads;
        this.slgses = slgses;
        const md5Map: ObjectOf<ImportComponentCad[]> = {};
        cads.forEach((cad) => {
            const md5Str = this._getMd5(cad.data);
            if (md5Map[md5Str]) {
                md5Map[md5Str].push(cad);
            } else {
                md5Map[md5Str] = [cad];
            }
        });
        for (const md5Str in md5Map) {
            if (md5Map[md5Str].length > 1) {
                this.hasError = true;
                const uniCodes = md5Map[md5Str].map((v) => v.data.info.唯一码);
                md5Map[md5Str].forEach((cad) => {
                    cad.errors.push(`数据重复: ${uniCodes.filter((v) => v !== cad.data.info.唯一码).join(", ")}`);
                });
            }
        }
        const requireLineId = this._getImportConfig(isSuanliao).requireLineId.value ?? false;
        const addUniqCode = this._getImportConfig(isSuanliao).addUniqCode.value ?? false;
        const totalCad = cads.length;
        const totalSlgs = slgses.length;
        for (let i = 0; i < totalCad; i++) {
            this.msg = `正在检查dxf数据(${i + 1}/${totalCad})`;
            this.progressBar.forward();
            await this._validateCad(cads[i], uniqCodesCount, requireLineId, addUniqCode, isSuanliao);
        }
        for (let i = 0; i < totalSlgs; i++) {
            this.msg = `正在检查dxf数据(${i + 1}/${totalSlgs})`;
            this.progressBar.forward();
            await this._validateSlgs(slgses[i]);
        }

        let hasEmptyCad = false;
        const data = this.cads.map((v) => {
            if (v.data.entities.length < 1) {
                hasEmptyCad = true;
            }
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
        if (hasEmptyCad) {
            this.message.alert("数据为空或绿色框不封闭");
        } else {
            try {
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
        }
        this.cadsParsed = true;
    }

    private async _validateOptions(options: ObjectOf<string>) {
        const errors: string[] = [];
        for (const optionKey in options) {
            if (["铰边", "锁边"].includes(optionKey)) {
                continue;
            }
            const optionValues = this._getOptions(options[optionKey]);
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
                const optionInfo = await this.dataService.getOptions(optionKey, "");
                this._optionsCache[optionKey] = optionInfo.data.map((v) => v.name);
            }
            const optionsNotExist = difference(optionValues, this._optionsCache[optionKey], ["所有", "不选", "不选无"]);
            if (optionsNotExist.length > 0) {
                errors.push(`选项[${optionKey}]不存在或已停用: ${optionsNotExist.join(", ")}`);
            }
        }
        return errors;
    }

    private async _validateCad(
        cad: ImportComponentCad,
        uniqCodesCount: ObjectOf<number>,
        requireLineId: boolean,
        addUniqCode: boolean,
        isSuanliao: boolean
    ) {
        const data = cad.data;
        const names = [
            "包边正面",
            "顶框",
            "锁框",
            "铰框",
            "企料",
            "锁边",
            "铰边",
            "型号",
            "罗马柱",
            "罗马头",
            "中横框",
            "立柱",
            "上板",
            "中板",
            "下板",
            "压条",
            "包边饰条",
            "底框",
            "方通",
            "花件",
            "孔",
            "算料",
            "示意图"
        ];
        const namesReg = new RegExp(names.join("|"));

        if (Array.isArray(data.info.errors)) {
            cad.errors = cad.errors.concat(data.info.errors);
            delete data.info.errors;
        }
        const uniqCode = data.info.唯一码;
        if (!uniqCode) {
            if (addUniqCode) {
                if (isSuanliao) {
                    data.info.唯一码 = `${data.type}${data.options.型号 || ""}${data.options.开启 || ""}${data.name}`;
                } else {
                    const response = await this.dataService.post<string>("ngcad/generateUniqCode", {
                        uniqCode: `${data.type}${data.options.型号 || ""}${data.options.开启 || ""}${data.options.门扇厚度 || ""}${
                            data.name
                        }`
                    });
                    if (response?.data) {
                        data.info.唯一码 = response.data;
                    } else {
                        cad.errors.push("无法生成唯一码");
                    }
                }
            } else {
                cad.errors.push("没有唯一码");
            }
        } else if (uniqCodesCount[uniqCode] > 1) {
            cad.errors.push("唯一码重复: " + uniqCode);
        } else if (!uniqCode.match(namesReg)) {
            cad.errors.push("唯一码必须包含<br><br>" + names.join(", "));
        }
        if (!data.type && !cad.skipErrorCheck.has("分类")) {
            cad.errors.push("没有分类");
        }
        data.name = data.name.replaceAll("-", "_");
        if (data.name.match(/^\d+/)) {
            data.name = "_" + data.name;
        } else if (!data.name.match(this._cadNameRegex) && !cad.skipErrorCheck.has("名字")) {
            cad.errors.push("CAD名字只能是：中文、英文字母、数字、下划线");
        }
        let 修改包边正面宽规则 = data.info.修改包边正面宽规则;
        if (data.type === "包边正面") {
            修改包边正面宽规则 = "修改包边正面宽规则:\n" + 修改包边正面宽规则;
            cad.errors = cad.errors.concat(window.parseBaobianzhengmianRules(修改包边正面宽规则, data.info.vars).errors);
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
            const lines = entities.toArray((v) => v instanceof CadLineLike);
            if (lines.some((v) => !v.info.idReplaced)) {
                cad.errors.push("存在没有id的线");
            }
        }
        cad.errors = cad.errors.concat(validateLines(data).errMsg);
        cad.errors = cad.errors.concat(await this._validateOptions(data.options));

        const infoObj: ObjectOf<PeiheInfo[]> = {
            锁企料: [
                {type: "锁框", options: {}},
                {type: "顶框", options: {}}
            ],
            扇锁企料: [{type: "小锁料", options: {isNot: {产品分类: ["单门", "", undefined, null]}}}],
            铰企料: [{type: "小铰料", options: {}}]
        };
        data.info.锁边自动绑定可搭配铰边?.split(";").forEach((v) => {
            infoObj.锁企料.push({type: "铰企料", options: {is: {铰边: v}}, hint: v});
        });
        let infoArray: PeiheInfo[];
        if (data.type === "锁企料" && data.type2 === "扇锁企料") {
            infoArray = infoObj[data.type2];
        } else {
            infoArray = infoObj[data.type];
        }
        if (infoArray !== undefined) {
            const infoArray2: PeiheInfo[] = [];
            for (const info of infoArray) {
                const {options, value} = await this._hasPeiheCad(info, data.options);
                if (!value) {
                    console.log(options, data.options);
                    infoArray2.push(info);
                }
            }
            const result = await this._matchPeiheCad(infoArray2, data.options);
            result.forEach((matched, i) => {
                const info = infoArray2[i];
                if (!matched) {
                    let error = `缺少对应${info.type}`;
                    if (info.hint) {
                        error += `: ${info.hint}`;
                    }
                    cad.errors.push(error);
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
            if (reservedDimNames.includes(e.mingzi)) {
                cad.errors.push(`标注名字不能是: ${e.mingzi}`);
            }
            if (isShiyitu(data)) {
                if (e.mingzi.includes("=")) {
                    cad.errors.push("示意图标注不能有=号");
                } else {
                    e.mingzi = "显示公式: " + e.mingzi;
                }
            } else {
                if (e.info.isGongshi) {
                    e.mingzi = "显示公式: " + e.mingzi;
                    const id1 = e.entity1.id;
                    const id2 = e.entity2.id;
                    if (!(id1 && id2) || id1 !== id2) {
                        cad.errors.push(`公式标注[=${e.mingzi}]识别错误, 必须标到同一条线的两个端点`);
                    }
                }
            }
        });

        if (cad.errors.length > 0) {
            this.hasError = true;
            if (this.sourceCad) {
                const sourceCadInfo = this._sourceCadMap[data.id];
                const mtext = new CadMtext();
                mtext.text = cad.errors.join("\n");
                mtext.color = new Color("red");
                mtext.layer = this._errorMsgLayer;
                mtext.insert.set(sourceCadInfo.rect.left, sourceCadInfo.rect.bottom - 10);
                this.sourceCad.entities.add(mtext);
            }
        }
    }

    private async _validateSlgs(slgs: ImportComponentSlgs) {
        const data = slgs.data;
        slgs.errors = slgs.errors.concat(await this._validateOptions(data.选项));
        const silent = this.dataService.silent;
        this.dataService.silent = true;
        const strict = this.dataService.strict;
        this.dataService.strict = false;
        const response = await this.dataService.post("ngcad/validateFormulas", {formulas: data.公式});
        this.dataService.silent = silent;
        this.dataService.strict = strict;
        if (response?.code !== 0) {
            const msg = response?.msg || "验证算料公式时出错";
            slgs.errors.push(msg);
        }
        if (slgs.errors.length > 0) {
            this.hasError = true;
        }
    }

    private _getOptions(str: string | undefined | null) {
        if (!str) {
            return [];
        }
        return str.split(";");
    }

    private async _hasPeiheCad(info: PeiheInfo, options: ObjectOf<string>) {
        const {is, isNot} = info.options;
        const result: {options: ObjectOf<string[]>; value: boolean} = {options: {}, value: false};
        this.cads.forEach(({data}) => {
            if (data.type !== info.type && data.type2 !== info.type) {
                return;
            }
            if (is) {
                for (const optionName in is) {
                    if (!is[optionName].includes(data.options[optionName])) {
                        return;
                    }
                }
            }
            if (isNot) {
                for (const optionName in isNot) {
                    if (isNot[optionName].includes(data.options[optionName])) {
                        return;
                    }
                }
            }
            for (const optionName in options) {
                const values1 = this._getOptions(options[optionName]);
                const values2 = this._getOptions(data.options[optionName]);
                if (values2.length < 1 || data.options[optionName] === "所有") {
                    continue;
                }
                if (intersection(values1, values2).length < 1) {
                    return;
                }
            }
            for (const optionName in options) {
                this._getOptions(data.options[optionName]).forEach((v) => {
                    if (!result.options[optionName]) {
                        result.options[optionName] = [v];
                    } else if (!result.options[optionName].includes(v)) {
                        result.options[optionName].push(v);
                    }
                });
            }
        });
        if (info.type === "小锁料") {
            if (!result.options.产品分类) {
                result.options.产品分类 = [];
            }
            result.options.产品分类.push("单门");
        }
        for (const optionName in options) {
            if (difference(options[optionName].split(";"), result.options[optionName]).length > 0) {
                return result;
            }
        }
        result.value = true;
        return result;
    }

    private async _matchPeiheCad(infoArray: PeiheInfo[], options: ObjectOf<string>) {
        const result: boolean[] = [];
        const indice: number[] = [];
        const cache = this._peiheCadCache;
        const keys = infoArray.map((info, i) => {
            const key = md5(JSON.stringify({info, options}));
            if (cache[key] !== undefined) {
                result[i] = cache[key];
            } else {
                result[i] = false;
                indice.push(i);
            }
            return key;
        });
        infoArray.forEach((info, i) => {
            if (cache[keys[i]] !== undefined) {
                result[i] = cache[keys[i]];
            } else {
                indice.push(i);
            }
        });
        if (indice.length > 0) {
            infoArray = infoArray.filter((_, i) => indice.includes(i));
            const response = await this.dataService.post<boolean[]>("peijian/cad/matchPeiheCad", {infoArray, options});
            if (response?.data) {
                response.data.forEach((matched, i) => {
                    const j = indice[i];
                    result[j] = matched;
                    cache[keys[j]] = matched;
                });
            }
        }
        return result;
    }

    async downloadSourceCad() {
        if (!this.sourceCad) {
            return;
        }
        this.loader.startLoader(this.loaderIds.downloadSourceCad);
        await this.dataService.downloadDxf(this.sourceCad);
        this.loader.stopLoader(this.loaderIds.downloadSourceCad);
    }
}
