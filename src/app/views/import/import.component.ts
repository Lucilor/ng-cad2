import {Component, OnInit} from "@angular/core";
import {replaceChars, session} from "@app/app.common";
import {reservedDimNames} from "@app/cad.utils";
import {
    CadArc,
    CadCircle,
    CadData,
    CadDimension,
    CadLeader,
    CadLine,
    CadLineLike,
    CadMtext,
    CadZhankai,
    generateLineTexts,
    generatePointsMap,
    sortLines,
    validateLines
} from "@cad-viewer";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {Utils} from "@mixins/utils.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {Line, ObjectOf, Point, ProgressBar, Rectangle} from "@utils";
import {difference} from "lodash";
import md5 from "md5";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {environment} from "src/environments/environment";
import {cadFields, skipFields, Slgs, slgsFields} from "./import.config";

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
        contains?: string[];
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
    private _cadsKey = "import-cads";
    private _cadNameRegex = /^(?!\d)[\da-zA-Z\u4e00-\u9fa5_]*$/u;
    private _optionsCache: ObjectOf<string[]> = {};
    private _peiheCadCache: ObjectOf<boolean> = {};

    loaderIds = {importLoader: "importLoader", importSuanliaoLoader: "importSuanliaoLoader"};
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
            const cache = session.load<[ImportComponentCad[], ImportComponentSlgs[]]>(this._cadsKey);
            if (cache) {
                this.cads = cache[0].map((v) => ({...v, data: new CadData(v.data)}));
                this.slgses = cache[1];
            }
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
        const {cads, slgses} = this._splitCad(data, isSuanliao);
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
            await this._validateCad(cads[i], uniqCodesCount, requireLineId, addUniqCode);
        }
        for (let i = 0; i < totalSlgs; i++) {
            this.msg = `正在检查dxf数据(${i + 1}/${totalSlgs})`;
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
        const checkResult = window.batchCheck(data);
        this.cads.forEach((cad) => {
            const errors = checkResult[cad.data.id];
            if (errors && errors.length > 0) {
                cad.errors = cad.errors.concat(errors);
            }
        });

        session.save(this._cadsKey, [this.cads.map((v) => ({...v, data: environment.production ? null : v.data.export()})), this.slgses]);
        this.cadsParsed = true;
    }

    private async _removeLeaders(cad: CadData) {
        const leaders = cad.entities.leader;
        const map = generatePointsMap(cad.entities);
        leaders.forEach((e) => {
            cad.entities.remove(e);
            for (const v of map) {
                if (v.lines.length === 2 && e.vertices[0].distanceTo(v.point) <= 5) {
                    cad.zhidingweizhipaokeng.push([v.lines[0].id, v.lines[1].id]);
                    break;
                }
            }
        });
    }

    private _splitCad(sourceData: CadData, isSuanliao: boolean) {
        const lines = sourceData.entities.line.filter((v) => v.color.rgbNumber() === 0x00ff00);
        const lineIds = lines.map((v) => v.id);
        const dumpData = new CadData();

        dumpData.entities.line = lines;
        const rects: Rectangle[] = [];
        const sorted = sortLines(dumpData);

        const getObject = (text: string, separator: string) => {
            const strs = text.split(separator);
            const keyValuePairs: [string, string][] = [];
            const obj: ObjectOf<string> = {};
            strs.forEach((str, j) => {
                if (j === 0) {
                    keyValuePairs[j] = [str.trim(), ""];
                } else if (j === strs.length - 1) {
                    keyValuePairs[j - 1][1] = str.trim();
                } else {
                    const arr = str.split("\n");
                    keyValuePairs[j - 1][1] = arr.slice(0, -1).join("\n").trim();
                    keyValuePairs[j] = [arr[arr.length - 1].trim(), ""];
                }
            });
            keyValuePairs.forEach(([k, v]) => (obj[k] = v));
            return obj;
        };

        sorted.forEach((group) => {
            const min = new Point(Infinity, Infinity);
            const max = new Point(-Infinity, -Infinity);
            group.forEach(({start, end}) => {
                min.x = Math.min(min.x, start.x, end.x);
                min.y = Math.min(min.y, start.y, end.y);
                max.x = Math.max(max.x, start.x, end.x);
                max.y = Math.max(max.y, start.y, end.y);
            });
            rects.push(new Rectangle(min, max));
        });
        rects.sort((a, b) => {
            const {x: x1, y: y1} = a;
            const {x: x2, y: y2} = b;
            if (Math.abs(y1 - y2) < (a.height + b.height) / 4) {
                return x1 - x2;
            }
            return y1 - y2;
        });

        const cads: ImportComponentCad[] = rects.map(() => ({data: new CadData(), errors: [], skipErrorCheck: new Set()}));
        const slgses: ImportComponentSlgs[] = [];
        sourceData.getAllEntities().forEach((e) => {
            if (lineIds.includes(e.id)) {
                return;
            }
            if (isSuanliao && e instanceof CadMtext) {
                const text = replaceChars(e.text);
                const slgsReg = /算料公式[:]?([\w\W]*)/;
                const suanliaoMatch = text.match(slgsReg);
                if (suanliaoMatch) {
                    const obj = getObject(text.replace(slgsReg, ""), ":");
                    const slgsData: ObjectOf<any> = {公式: getObject(suanliaoMatch[1], "=")};
                    const errors: string[] = [];
                    for (const key in obj) {
                        const value = obj[key];
                        slgsFields.forEach((field) => {
                            if (value.includes(field)) {
                                errors.push(`${field}缺少冒号`);
                            }
                        });
                        const key2 = cadFields[key];
                        if (key2) {
                            if (value === "是") {
                                (slgsData[key] as boolean) = true;
                            } else if (value === "否") {
                                (slgsData[key] as boolean) = false;
                            } else {
                                (slgsData[key] as string) = value;
                            }
                        } else if (key === "条件") {
                            slgsData.条件 = value ? [value] : [];
                        } else if (key !== "唯一码") {
                            if (!slgsData.选项) {
                                slgsData.选项 = {};
                            }
                            slgsData.选项[key] = value;
                        }
                    }
                    slgses.push({data: slgsData as Slgs, errors});
                    return;
                }
            }
            rects.forEach((rect, i) => {
                const entities = cads[i].data.entities;
                if (e instanceof CadLine && rect.contains(new Line(e.start, e.end))) {
                    entities.add(e);
                } else if (e instanceof CadMtext && rect.contains(e.insert)) {
                    entities.add(e);
                } else if (e instanceof CadArc && rect.contains(new Line(e.start, e.end))) {
                    // ? 判断圆弧是否在矩形内, 此方法不严谨
                    entities.add(e);
                } else if (e instanceof CadCircle) {
                    const min = e.center.clone().sub(e.radius);
                    const max = e.center.clone().add(e.radius);
                    if (rect.contains(new Rectangle(min, max))) {
                        entities.add(e);
                    }
                } else if (e instanceof CadDimension) {
                    const pts = sourceData.getDimensionPoints(e);
                    if (pts.every((p) => rect.contains(p))) {
                        entities.add(e);
                    }
                } else if (e instanceof CadLeader) {
                    const pts = e.vertices;
                    if (pts.length === 2 && rect.contains(pts[1])) {
                        entities.add(e);
                    }
                }
            });
        });

        const infoKeys = ["唯一码", "修改包边正面宽规则", "锁边自动绑定可搭配铰边"];

        cads.forEach((cad) => {
            const data = cad.data;
            let toRemove = -1;
            this._removeLeaders(data);
            data.info.errors = [];
            data.entities.mtext.some((e, i) => {
                if (e.text.startsWith("唯一码")) {
                    toRemove = i;
                    const obj = getObject(replaceChars(e.text), ":");
                    let zhankaiObjs: ObjectOf<any>[] = [];
                    for (const key in obj) {
                        if (skipFields.includes(key)) {
                            continue;
                        }
                        const value = obj[key];
                        for (const fieldKey in cadFields) {
                            if (fieldKey === "分类" && value.includes("产品分类")) {
                                continue;
                            }
                            if (value.includes(fieldKey)) {
                                cad.errors.push(`${fieldKey}缺少冒号`);
                                cad.skipErrorCheck.add(key);
                                cad.skipErrorCheck.add(fieldKey);
                            }
                        }
                        if (key === "展开") {
                            zhankaiObjs = Array.from(value.matchAll(/\[([^\]]*)\]/g)).map((vv) => {
                                const [zhankaikuan, zhankaigao, shuliang, conditions] = vv[1].split(/[,，]/);
                                if (!zhankaikuan || !zhankaigao || !shuliang) {
                                    cad.errors.push(`展开信息不全`);
                                    return {};
                                }
                                return {zhankaikuan, zhankaigao, shuliang, conditions: conditions ? [conditions] : undefined};
                            });
                            continue;
                        }
                        obj[key] = value;
                        const key2 = cadFields[key];
                        if (key2) {
                            if (value === "是") {
                                (data[key2] as boolean) = true;
                            } else if (value === "否") {
                                (data[key2] as boolean) = false;
                            } else {
                                (data[key2] as string) = value;
                            }
                        } else if (infoKeys.includes(key)) {
                            data.info[key] = value;
                        } else if (key === "条件") {
                            data.conditions = value.split(";");
                        } else {
                            data.options[key] = value.replaceAll(" ", "");
                        }
                    }
                    data.zhankai = zhankaiObjs.map((o) => new CadZhankai(o));
                    return true;
                }
                return false;
            });
            if (toRemove >= 0) {
                data.entities.mtext.splice(toRemove, 1);
            }

            data.info.vars = {};
            [...data.entities.line, ...data.entities.arc].forEach((e) => {
                const varName = e.info.varName;
                if (varName) {
                    data.info.vars[varName] = e.id;
                }
                delete e.info.varName;
            });
            generateLineTexts(data);
        });
        return {cads, slgses};
    }

    private async _validateOptions(options: ObjectOf<string>) {
        const errors: string[] = [];
        for (const optionKey in options) {
            if (["铰边", "锁边"].includes(optionKey)) {
                continue;
            }
            const optionValues = options[optionKey].split(";");
            if (this._optionsCache[optionKey] === undefined) {
                const optionInfo = await this.dataService.getOptions(optionKey, "");
                this._optionsCache[optionKey] = optionInfo.data.map((v) => v.name);
            }
            const optionsNotExist = difference(optionValues, this._optionsCache[optionKey], ["所有", "不选"]);
            if (optionsNotExist.length > 0) {
                errors.push(`选项[${optionKey}]不存在或已停用: ${optionsNotExist.join(", ")}`);
            }
        }
        return errors;
    }

    private async _validateCad(cad: ImportComponentCad, uniqCodesCount: ObjectOf<number>, requireLineId: boolean, addUniqCode: boolean) {
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
                const response = await this.dataService.post<string>("ngcad/generateUniqCode", {
                    uniqCode: `型号${data.options.型号}${data.name}`
                });
                if (response?.data) {
                    data.info.唯一码 = response.data;
                } else {
                    cad.errors.push("无法生成唯一码");
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
        if (data.type === "包边正面") {
            if (data.info.修改包边正面宽规则) {
                const 修改包边正面宽规则 = "修改包边正面宽规则:\n" + data.info.修改包边正面宽规则;
                cad.errors = cad.errors.concat(window.parseBaobianzhengmianRules(修改包边正面宽规则, data.info.vars).errors);
            } else {
                cad.errors.push("分类为包边正面必须写修改包边正面宽规则");
            }
        } else if (data.info.修改包边正面宽规则) {
            cad.errors.push("分类不为包边正面不能写修改包边正面宽规则");
        }
        if (data.info.锁边自动绑定可搭配铰边 && !["锁企料", "扇锁企料"].includes(data.type)) {
            cad.errors.push("分类不为[锁企料]时不能有[锁边自动绑定可搭配铰边]");
        }
        if (data.kailiaoshibaokeng && data.zhidingweizhipaokeng.length > 0) {
            cad.errors.push("不能同时设置[全部刨坑]和[指定位置刨坑]");
        }
        const entities = data.getAllEntities();
        if (requireLineId) {
            const lines = entities.toArray((v) => v instanceof CadLineLike);
            if (lines.some((v) => !v.info.idReplaced)) {
                cad.errors.push("存在没有Id的线");
            }
        }
        if (data.type !== "示意图") {
            cad.errors = cad.errors.concat(validateLines(data).errMsg);
        }
        cad.errors = cad.errors.concat(await this._validateOptions(data.options));
        if (cad.errors.length > 0) {
            this.hasError = true;
        }

        const infoObj: ObjectOf<PeiheInfo[]> = {
            锁企料: [
                {type: "锁框", options: {contains: ["门扇厚度", "开启"]}},
                {type: "顶框", options: {contains: ["门扇厚度", "开启"]}},
                {type: "小锁料", options: {contains: ["门扇厚度", "开启"], isNot: {产品分类: ["单门", "", undefined, null]}}}
            ],
            铰企料: [{type: "小铰料", options: {contains: ["门扇厚度", "开启", "门铰"]}}]
        };
        if (data.info.锁边自动绑定可搭配铰边) {
            data.info.锁边自动绑定可搭配铰边.split(";").forEach((v) => {
                infoObj.锁企料.push({type: "铰企料", options: {contains: ["门扇厚度", "开启"], is: {铰边: v}}, hint: v});
            });
        }
        infoObj.扇锁企料 = [...infoObj.锁企料];
        if (infoObj[data.type] !== undefined) {
            const infoArray: PeiheInfo[] = [];
            for (const info of infoObj[data.type]) {
                const hasPeiheCad = await this._hasPeiheCad(info, data.options);
                if (!hasPeiheCad) {
                    infoArray.push(info);
                }
            }
            const result = await this._matchPeiheCad(infoArray, data.options);
            result.forEach((matched, i) => {
                const info = infoObj[data.type][i];
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
            const id1 = e.entity1.id;
            const id2 = e.entity2.id;
            if (e.info.isGongshi && (!(id1 && id2) || id1 !== id2)) {
                if (data.type === "示意图") {
                    e.mingzi = "显示公式: " + e.mingzi;
                } else {
                    cad.errors.push(`公式标注[=${e.mingzi}]识别错误, 必须标到同一条线的两个端点`);
                }
            }
        });
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

    private async _hasPeiheCad(info: PeiheInfo, options: ObjectOf<string>) {
        const containsOptions = (optionValue1: string | undefined, optionValue2: string | undefined) => {
            const values1 = (optionValue1 || "").split(";").map((v) => v.trim());
            const values2 = (optionValue2 || "").split(";").map((v) => v.trim());
            return values2.every((v) => values1.includes(v));
        };
        const {contains, is, isNot} = info.options;
        const found = this.cads.findIndex(({data}) => {
            if (data.type !== info.type) {
                return false;
            }
            if (contains) {
                for (const optionName of contains) {
                    if (!containsOptions(data.options[optionName], options[optionName])) {
                        return false;
                    }
                }
            }
            if (is) {
                for (const optionName in is) {
                    if (!is[optionName].includes(data.options[optionName])) {
                        return false;
                    }
                }
            }
            if (isNot) {
                for (const optionName in isNot) {
                    if (isNot[optionName].includes(data.options[optionName])) {
                        return false;
                    }
                }
            }
            return true;
        });
        return found >= 0;
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
}
