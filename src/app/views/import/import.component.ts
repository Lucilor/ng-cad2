import {Component, OnInit} from "@angular/core";
import {session} from "@app/app.common";
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
    generatePointsMap,
    sortLines,
    validateLines
} from "@cad-viewer";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {Line, ObjectOf, Point, ProgressBar, Rectangle} from "@utils";
import {difference} from "lodash";
import md5 from "md5";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {environment} from "src/environments/environment";
import {fields, zhankaiFields} from "./import.config";

export interface ImportComponentCad {
    data: CadData;
    errors: string[];
}

export type ImportComponentConfigName = "requireLineId" | "pruneLines";
export type ImportComponentConfig = {
    name: ImportComponentConfigName;
    label: string;
    value: boolean | null;
}[];

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
export class ImportComponent implements OnInit {
    private _cadsKey = "import-cads";
    private _cadNameRegex = /^(?!\d)[\da-zA-Z\u4e00-\u9fa5_]*$/u;
    private _optionsCache: ObjectOf<string[]> = {};
    private _peiheCadCache: ObjectOf<boolean> = {};
    private _slgsArr: ObjectOf<string>[] = [];

    loaderId = "importLoader";
    msg = "";
    cads: ImportComponentCad[] = [];
    cadsParsed = false;
    hasError = false;
    progressBar = new ProgressBar(0);
    progressBarStatus: ProgressBarStatus = "hidden";
    importConfig: ImportComponentConfig = [
        {name: "requireLineId", label: "上传线必须全部带ID", value: null},
        {name: "pruneLines", label: "后台线在上传数据中没有时删除", value: null}
    ];
    get canSubmit() {
        const {requireLineId, pruneLines} = this._getConfig();
        return requireLineId !== null && pruneLines !== null;
    }

    constructor(private loader: NgxUiLoaderService, private dataService: CadDataService, private message: MessageService) {}

    ngOnInit() {
        const cads: ImportComponentCad[] | null = session.load<any[]>(this._cadsKey);
        if (cads && !environment.production) {
            this.cads = cads.map((v) => ({...v, data: new CadData(v.data)}));
        }
        if (!environment.production) {
            this.importConfig[0].value = false;
            this.importConfig[1].value = true;
        }
    }

    private _getConfig() {
        const result: ObjectOf<boolean | null> = {};
        this.importConfig.forEach((v) => (result[v.name] = v.value));
        return result as Record<ImportComponentConfigName, boolean>;
    }

    async importDxf(event: Event) {
        const el = event.target as HTMLInputElement;
        const finish = (hasLoader: boolean, progressBarStatus: ProgressBarStatus, msg?: string) => {
            if (hasLoader) {
                this.loader.stopLoader(this.loaderId);
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
        this.loader.startLoader(this.loaderId);
        const data = await this.dataService.uploadDxf(el.files[0]);
        if (!data) {
            finish(true, "error", "读取文件失败");
            return;
        }
        const cads = this._splitCad(data);
        const totalCad = cads.length;
        const totalSlgs = this._slgsArr.length;
        this.progressBar.start(totalCad * 2 + totalSlgs);
        this.msg = "正在检查数据";
        await this.parseCads(cads);
        if (this.hasError) {
            finish(true, "error", "数据有误");
            return;
        }
        let skipped = 0;
        const silent = this.dataService.silent;
        this.dataService.silent = true;
        const {pruneLines} = this._getConfig();
        for (let i = 0; i < totalCad; i++) {
            const result = await this.dataService.setCad({
                collection: "cad",
                cadData: cads[i],
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
            const response = await this.dataService.post("ngcad/updateSuanliaogonshi", {data: this._slgsArr[i]});
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

    async parseCads(cads: CadData[]) {
        this.cadsParsed = false;
        this.hasError = false;
        this._clearCache();
        const uniqCodesCount: ObjectOf<number> = {};
        cads.forEach((v) => {
            const uniqCode = v.info.唯一码;
            if (!uniqCode) {
                return;
            }
            if (uniqCodesCount[uniqCode] === undefined) {
                uniqCodesCount[uniqCode] = 1;
            } else {
                uniqCodesCount[uniqCode]++;
            }
        });

        this.cads = [];
        const md5Map: ObjectOf<ImportComponentCad[]> = {};
        const total = cads.length;
        for (let i = 0; i < total; i++) {
            const cad = cads[i];
            const item: ImportComponentCad = {
                data: cad,
                errors: []
            };
            this.cads.push(item);
            const md5Str = this._getMd5(cad);
            if (md5Map[md5Str]) {
                md5Map[md5Str].push(item);
            } else {
                md5Map[md5Str] = [item];
            }
        }
        for (const md5Str in md5Map) {
            if (md5Map[md5Str].length > 1) {
                this.hasError = true;
                const uniCodes = md5Map[md5Str].map((v) => v.data.info.唯一码);
                md5Map[md5Str].forEach((cad) => {
                    cad.errors.push(`数据重复: ${uniCodes.filter((v) => v !== cad.data.info.唯一码).join(", ")}`);
                });
            }
        }
        const {requireLineId} = this._getConfig();
        for (let i = 0; i < total; i++) {
            this.msg = `正在检查dxf数据(${i + 1}/${total})`;
            this.progressBar.forward();
            await this._validateCad(this.cads[i], uniqCodesCount, requireLineId);
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

        session.save(
            this._cadsKey,
            this.cads.map((v) => ({...v, data: environment.production ? null : v.data.export()}))
        );
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

    private _splitCad(data: CadData) {
        const lines = data.entities.line.filter((v) => v.color.rgbNumber() === 0x00ff00);
        const lineIds = lines.map((v) => v.id);
        const dumpData = new CadData();

        dumpData.entities.line = lines;
        const rects: Rectangle[] = [];
        const sorted = sortLines(dumpData);

        const getObject = (text: string) => {
            text = text.replaceAll("：", ":").replaceAll("；", ";");
            const strs = text.split(":");
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

        const result = rects.map(() => new CadData());
        this._slgsArr = [];
        data.getAllEntities().forEach((e) => {
            if (lineIds.includes(e.id)) {
                return;
            }
            if (e instanceof CadMtext && e.text.includes("算料公式")) {
                const obj = getObject(e.text);
                const slgs: ObjectOf<any> = {};
                for (const key in obj) {
                    const value = obj[key];
                    if (["名字", "条件"].includes(key)) {
                        slgs[key] = value;
                    } else if (key === "算料公式") {
                        slgs.公式 = {};
                        value
                            .split("\n")
                            .filter((v) => v)
                            .forEach((v) => {
                                const [key2, value2] = v.split("=").map((vv) => vv.trim());
                                slgs.公式[key2] = value2;
                            });
                    } else {
                        if (!slgs.选项) {
                            slgs.选项 = {};
                        }
                        slgs.选项[key] = value;
                    }
                }
                this._slgsArr.push(slgs);
                return;
            }
            rects.forEach((rect, i) => {
                if (e instanceof CadLine && rect.contains(new Line(e.start, e.end))) {
                    result[i].entities.add(e);
                } else if (e instanceof CadMtext && rect.contains(e.insert)) {
                    result[i].entities.add(e);
                } else if (e instanceof CadArc && rect.contains(new Line(e.start, e.end))) {
                    // ? 判断圆弧是否在矩形内, 此方法不严谨
                    result[i].entities.add(e);
                } else if (e instanceof CadCircle) {
                    const min = e.center.clone().sub(e.radius);
                    const max = e.center.clone().add(e.radius);
                    if (rect.contains(new Rectangle(min, max))) {
                        result[i].entities.add(e);
                    }
                } else if (e instanceof CadDimension) {
                    const pts = data.getDimensionPoints(e);
                    if (pts.every((p) => rect.contains(p))) {
                        result[i].entities.add(e);
                    }
                } else if (e instanceof CadLeader) {
                    const pts = e.vertices;
                    if (pts.length === 2 && rect.contains(pts[1])) {
                        result[i].entities.add(e);
                    }
                }
            });
        });

        const infoKeys = ["唯一码", "修改包边正面宽规则", "锁边自动绑定可搭配铰边"];

        result.forEach((v) => {
            let toRemove = -1;
            this._removeLeaders(v);
            v.info.errors = [];
            v.entities.mtext.some((e, i) => {
                if (e.text.startsWith("唯一码")) {
                    toRemove = i;
                    const obj = getObject(e.text);
                    const zhankaiObjs: ObjectOf<string>[] = [];
                    for (const key in obj) {
                        const value = obj[key];
                        let isZhankaiKey = false;
                        for (const zhankaiKey of Object.keys(zhankaiFields)) {
                            if (key === zhankaiKey) {
                                if (!zhankaiObjs[0]) {
                                    zhankaiObjs[0] = {};
                                }
                                zhankaiObjs[0][zhankaiFields[key]] = value;
                                isZhankaiKey = true;
                            } else if (key.startsWith(zhankaiKey)) {
                                const num = Number(key.replace(zhankaiKey, "")) - 1;
                                if (num > 0) {
                                    if (!zhankaiObjs[num]) {
                                        zhankaiObjs[num] = {};
                                    }
                                    zhankaiObjs[num][zhankaiFields[zhankaiKey]] = value;
                                    if (zhankaiObjs[num - 1][zhankaiFields[zhankaiKey]] === undefined) {
                                        v.info.errors.push(`有${key}但没有${zhankaiKey + (num - 1 > 0 ? num - 1 : "")}`);
                                    }
                                    isZhankaiKey = true;
                                }
                            }
                        }
                        if (isZhankaiKey) {
                            continue;
                        }
                        obj[key] = value;
                        const key2 = fields[key];
                        if (key2) {
                            if (value === "是") {
                                (v[key2] as boolean) = true;
                                console.log(value, key, key2, v[key2]);
                            } else if (value === "否") {
                                (v[key2] as boolean) = false;
                            } else {
                                (v[key2] as string) = value;
                            }
                        } else if (infoKeys.includes(key)) {
                            v.info[key] = value;
                        } else if (key === "条件") {
                            v.conditions = value.split(";");
                        } else {
                            v.options[key] = value.replaceAll(" ", "");
                        }
                    }
                    v.zhankai = zhankaiObjs.map((o) => new CadZhankai(o));
                    return true;
                }
                return false;
            });
            if (toRemove >= 0) {
                v.entities.mtext.splice(toRemove, 1);
            }

            v.info.vars = {};
            [...v.entities.line, ...v.entities.arc].forEach((e) => {
                const varName = e.info.varName;
                if (varName) {
                    v.info.vars[varName] = e.id;
                }
                delete e.info.varName;
            });
        });
        return result;
    }

    private async _validateCad(cad: ImportComponentCad, uniqCodesCount: ObjectOf<number>, requireLineId: boolean) {
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
            "算料"
        ];
        const namesReg = new RegExp(names.join("|"));

        if (Array.isArray(data.info.errors)) {
            cad.errors = cad.errors.concat(data.info.errors);
            delete data.info.errors;
        }
        const uniqCode = data.info.唯一码;
        if (!uniqCode) {
            cad.errors.push("没有唯一码");
        } else if (uniqCodesCount[uniqCode] > 1) {
            cad.errors.push("唯一码重复: " + uniqCode);
        } else if (!uniqCode.match(namesReg)) {
            cad.errors.push("唯一码必须包含<br><br>" + names.join(", "));
        }
        if (!data.type) {
            cad.errors.push("没有分类");
        }
        data.name = data.name.replaceAll("-", "_");
        if (data.name.match(/^\d+/)) {
            data.name = "_" + data.name;
        } else if (!data.name.match(this._cadNameRegex)) {
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
        cad.errors = cad.errors.concat(validateLines(data).errMsg);
        for (const optionKey in data.options) {
            if (["铰边", "锁边"].includes(optionKey)) {
                continue;
            }
            const optionValues = data.options[optionKey].split(";");
            if (this._optionsCache[optionKey] === undefined) {
                const optionInfo = await this.dataService.getOptions(optionKey, "");
                this._optionsCache[optionKey] = optionInfo.data.map((v) => v.name);
            }
            const optionsNotExist = difference(optionValues, this._optionsCache[optionKey], ["所有", "不选"]);
            if (optionsNotExist.length > 0) {
                cad.errors.push(`选项[${optionKey}]不存在: ${optionsNotExist.join(", ")}`);
            }
        }
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
