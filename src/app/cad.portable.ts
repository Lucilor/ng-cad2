import {
    CadArc,
    CadCircle,
    CadData,
    CadDimension,
    CadEntities,
    CadLeader,
    CadLine,
    CadLineLike,
    CadMtext,
    CadVersion,
    CadZhankai,
    generateLineTexts,
    generatePointsMap,
    setLinesLength,
    sortLines
} from "@cad-viewer";
import {keysOf, Line, ObjectOf, Point, Rectangle} from "@utils";
import {difference, intersection, isEqual} from "lodash";
import {replaceChars} from "./app.common";
import {isShiyitu} from "./cad.utils";

export interface Slgs {
    名字: string;
    分类: string;
    条件: string[];
    选项: ObjectOf<string>;
    公式: ObjectOf<string>;
}

export interface CadInfo {
    data: CadData;
    errors: string[];
    skipErrorCheck: Set<string>;
}

/**
 * 算料公式
 */
export interface SlgsInfo {
    data: Slgs;
    errors: string[];
}

/**
 * 型号配置
 */
export interface XinghaoInfo {
    data: ObjectOf<string>;
    errors: string[];
}

export type SourceCadMap = {
    cads: ObjectOf<{
        rect: Rectangle;
        rectLines: CadLineLike[];
        entities: CadEntities;
        text: CadMtext;
    }>;
    slgses: ObjectOf<{text: CadMtext}>;
    xinghao?: {text: CadMtext};
    xinghaoInfo?: {text: CadMtext};
};

export interface PeiheInfoObj {
    type: string;
    options?: {
        is?: ObjectOf<string>;
        isNot?: ObjectOf<(string | null | undefined)[]>;
    };
    hint?: string;
}
export type PeiheInfo = PeiheInfoObj | string;

export type ExportType = "包边正面" | "框型和企料" | "指定型号" | "自由选择" | "导出选中";

export interface CadImportParams {
    sourceCad: CadData;
    isXinghao: boolean;
    maxLineLength?: number;
}

export interface CadImportResult {
    cads: CadInfo[];
    slgses: SlgsInfo[];
    sourceCadMap: SourceCadMap;
    xinghaoInfo?: XinghaoInfo;
}

export interface CadSourceParams {
    sourceCad: CadData;
    importResult: CadImportResult;
    xinghaoInfo: ObjectOf<string>;
    slgses: ObjectOf<any>[];
}

export interface CadExportParams {
    cads: CadData[];
    type: ExportType;
    exportIds: boolean;
    sourceParams?: CadSourceParams;
}

export class CadPortable {
    static cadFields: ObjectOf<keyof CadData> = {
        名字: "name",
        分类: "type",
        分类2: "type2",
        全部刨坑: "kailiaoshibaokeng",
        板材纹理方向: "bancaiwenlifangxiang",
        默认开料板材: "morenkailiaobancai",
        算料处理: "suanliaochuli",
        显示宽度标注: "showKuandubiaozhu",
        双向折弯: "shuangxiangzhewan",
        算料特殊要求: "算料特殊要求",
        算料单显示: "suanliaodanxianshi",
        装配位置: "装配位置",
        企料包边门框配合位增加值: "企料包边门框配合位增加值",
        对应门扇厚度: "对应门扇厚度",
        主CAD: "主CAD",
        固定开料板材: "gudingkailiaobancai",
        条件: "conditions"
    };
    static infoFields = ["唯一码", "修改包边正面宽规则", "锁边自动绑定可搭配铰边"];
    static slgsFields = ["名字", "分类", "条件", "选项", "算料公式"];
    static skipFields = ["模板放大"];
    static xinghaoFields = [
        "门窗",
        "工艺",
        "产品分类",
        "门扇厚度",
        "指定可选锁边",
        "指定可选锁边",
        "默认锁边",
        "默认铰边",
        "大扇做法",
        "小扇做法",
        "门中门门扇背面",
        "框扇同板材",
        "门扇相同",
        "中空高比例",
        "花件前压条",
        "花件后压条",
        "门扇正面压条",
        "门扇背面压条",
        "有背封板",
        "背封板压条",
        "做平开门中门时无背封板",
        "默认花件数量",
        "需要配置花件",
        "独立板材企料分类",
        "使用企料包边做主CAD",
        "前后企料结构指定企料分类",
        "默认前企料结构",
        "默认后企料后结构",
        "企料包边无上下包"
    ];
    static xinghaoFieldsRequired = ["门窗", "工艺", "产品分类", "门扇厚度", "指定可选锁边", "指定可选锁边"];

    static import(params: CadImportParams): CadImportResult {
        const {sourceCad, isXinghao, maxLineLength} = params;
        const lines = sourceCad.entities.line.filter((v) => v.getColor().rgbNumber() === 0x00ff00);
        const lineIds = lines.map((v) => v.id);
        const dumpData = new CadData();

        dumpData.entities.line = lines;
        const rects: Rectangle[] = [];
        const sorted = sortLines(dumpData);

        const getObject = (text: string, separator: string) => {
            text = text + "\n";
            let separatorIndex = -1;
            let key = "";
            let lastKey = "";
            let value = "";
            const obj: ObjectOf<string> = {};
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (separatorIndex === -1) {
                    key += char;
                } else {
                    value += char;
                }
                if (char === separator) {
                    separatorIndex = i;
                }
                if (char === "\n" && key) {
                    if (separatorIndex === -1) {
                        if (lastKey) {
                            obj[lastKey] = `${obj[lastKey]}\n${key}`.trim();
                        }
                    } else {
                        key = key.slice(0, -1).trim();
                        obj[key] = value.trim();
                        separatorIndex = -1;
                        lastKey = key;
                    }
                    key = "";
                    value = "";
                }
            }
            return obj;
        };

        const sourceCadMap: SourceCadMap = {cads: {}, slgses: {}};
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

        const cads: CadInfo[] = rects.map((rect, i) => {
            const data = new CadData();
            sourceCadMap.cads[data.id] = {rect, rectLines: sorted[i], entities: new CadEntities(), text: new CadMtext()};
            return {data, errors: [], skipErrorCheck: new Set()};
        });
        const slgses: SlgsInfo[] = [];
        const {cadFields, slgsFields, skipFields} = this;
        const globalOptions: CadData["options"] = {};
        let xinghaoInfo: XinghaoInfo | undefined;
        for (const e of sourceCad.entities.toArray()) {
            if (lineIds.includes(e.id)) {
                continue;
            }
            if (e instanceof CadMtext) {
                const text = replaceChars(e.text);
                if (isXinghao) {
                    const slgsReg = /算料公式[:]?([\w\W]*)/;
                    const suanliaoMatch = text.match(slgsReg);
                    if (suanliaoMatch) {
                        const obj = getObject(text.replace(slgsReg, ""), ":");
                        const slgsData: ObjectOf<any> = {公式: getObject(suanliaoMatch[1], "=")};
                        const errors: string[] = [];
                        sourceCadMap.slgses[obj.名字] = {text: e};
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
                        continue;
                    }
                    const xinghaoMatch = text.match(/^型号:([\w\W]*)/);
                    if (xinghaoMatch) {
                        sourceCadMap.xinghao = {text: e};
                        globalOptions.型号 = xinghaoMatch[1].trim();
                    }
                    const xinghaoInfoReg = /型号配置:([\w\W]*)/;
                    const xinghaoInfoMatch = text.match(xinghaoInfoReg);
                    if (xinghaoInfoMatch) {
                        sourceCadMap.xinghaoInfo = {text: e};
                        xinghaoInfo = {data: {}, errors: []};
                        const obj = getObject(xinghaoInfoMatch[1], ":");
                        for (const field of this.xinghaoFields) {
                            xinghaoInfo.data[field] = obj[field] || "";
                        }
                        const missingXinghaoFields = this.xinghaoFieldsRequired.filter((v) => !xinghaoInfo?.data[v]);
                        if (missingXinghaoFields.length > 0) {
                            xinghaoInfo.errors.push(`型号配置缺少以下字段:\n${missingXinghaoFields.join(", ")}`);
                        }
                        continue;
                    }
                }
            }
            slgses.forEach((slgs) => {
                slgs.data.选项 = {...slgs.data.选项, ...globalOptions};
            });
            rects.forEach((rect, i) => {
                let isInRect = false;
                if (e instanceof CadLine && rect.contains(new Line(e.start, e.end))) {
                    isInRect = true;
                } else if (e instanceof CadMtext && rect.contains(e.insert)) {
                    isInRect = true;
                } else if (e instanceof CadArc && rect.contains(new Line(e.start, e.end))) {
                    // ? 判断圆弧是否在矩形内, 此方法不严谨
                    isInRect = true;
                } else if (e instanceof CadCircle) {
                    const min = e.center.clone().sub(e.radius);
                    const max = e.center.clone().add(e.radius);
                    if (rect.contains(new Rectangle(min, max))) {
                        isInRect = true;
                    }
                } else if (e instanceof CadDimension) {
                    const pts = sourceCad.getDimensionPoints(e);
                    if (pts.every((p) => rect.contains(p))) {
                        isInRect = true;
                    }
                } else if (e instanceof CadLeader) {
                    const pts = e.vertices;
                    if (pts.length === 2 && rect.contains(pts[1])) {
                        isInRect = true;
                    }
                }
                if (isInRect) {
                    cads[i].data.entities.add(e.clone());
                    sourceCadMap.cads[cads[i].data.id].entities.add(e);
                }
            });
        }

        const emptyCad = new CadData();
        cads.forEach((cad) => {
            const data = cad.data;
            let toRemove = -1;
            this._removeLeaders(data);
            data.info.errors = [];
            data.options = {...globalOptions};
            data.entities.mtext.some((e, i) => {
                const text = replaceChars(e.text);
                if (text.startsWith("唯一码")) {
                    toRemove = i;
                    sourceCadMap.cads[data.id].text = e;
                    const obj = getObject(text, ":");
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
                                const arr = vv[1].split(",");
                                const zhankaikuan = arr[0];
                                const zhankaigao = arr[1];
                                const shuliang = arr[2];
                                const conditions = arr[3] ? [arr[3]] : undefined;
                                for (const vvv of [zhankaikuan, zhankaigao, shuliang]) {
                                    if (!vvv) {
                                        cad.errors.push("展开宽, 展开高和数量不能为空");
                                    } else if (vvv.match(/['"]/)) {
                                        cad.errors.push("展开宽, 展开高和数量不能有引号");
                                        break;
                                    }
                                }
                                return {zhankaikuan, zhankaigao, shuliang, conditions};
                            });
                            continue;
                        }
                        obj[key] = value;
                        const key2 = cadFields[key];
                        if (key2) {
                            const defaultValue = emptyCad[key2];
                            if (typeof defaultValue === "boolean") {
                                (data[key2] as boolean) = value === "是";
                            } else if (Array.isArray(defaultValue)) {
                                (data[key2] as string[]) = value.split(";").map((v) => v.trim());
                            } else {
                                (data[key2] as string) = value;
                            }
                        } else if (this.infoFields.includes(key)) {
                            data.info[key] = value;
                        } else {
                            if (globalOptions[key]) {
                                cad.errors.push(`多余的选项[${key}]`);
                            } else {
                                const optionValues = value.split(";").map((v) => v.trim());
                                data.options[key] = optionValues.filter((v) => v).join(";");
                            }
                        }
                    }
                    data.zhankai = zhankaiObjs.map((o) => new CadZhankai(o));
                    return true;
                }
                return false;
            });
            data.entities.dimension.forEach((e) => {
                e.cad1 = data.name;
                e.cad2 = data.name;
            });
            if (toRemove >= 0) {
                data.entities.mtext.splice(toRemove, 1);
            }

            data.info.vars = {};
            for (const e of [...data.entities.line, ...data.entities.arc]) {
                const varName = e.info.varName;
                if (varName) {
                    data.info.vars[varName] = e.id;
                }
                delete e.info.varName;
            }

            if (typeof maxLineLength === "number" && !isShiyitu(data) && !data.shuangxiangzhewan && maxLineLength > 0) {
                const linesToSet = data.entities.line.filter((e) => e.gongshi && e.length > maxLineLength);
                setLinesLength(data, linesToSet, maxLineLength);
            }
            generateLineTexts(data);
        });
        return {cads, slgses, sourceCadMap, xinghaoInfo};
    }

    static export(params: CadExportParams) {
        const margin = 300;
        const padding = 80;
        const width = 855;
        const height = 1700;
        const cols = 10;
        const {type, exportIds} = params;
        const {sourceCad, importResult, xinghaoInfo, slgses} = params.sourceParams || {};
        const cads = params.cads.filter((v) => v.entities.length > 0 && Object.keys(v.options).length > 0);
        const emptyData = new CadData();

        const groupedCads: (CadData[] | null)[] = [];
        if (type === "框型和企料") {
            const infoObj: ObjectOf<PeiheInfo[]> = {
                锁企料: ["锁框", "顶框", "小锁料", "扇锁企料", "中锁料"],
                铰企料: ["中铰料", "铰框"]
            };
            const groups = {
                锁企料: [] as CadData[],
                铰企料: [] as CadData[]
            };
            const others: CadData[] = [];
            cads.forEach((cad) => {
                const types = this.getTypes(cad);
                let found = false;
                for (const key of keysOf(groups)) {
                    if (types.includes(key)) {
                        groups[key].push(cad);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    others.push(cad);
                }
            });
            const othersIds = new Set<string>();
            for (const key of keysOf(groups)) {
                groups[key].forEach((cad) => {
                    const arr = [cad];
                    groupedCads.push(arr);
                    const options1 = this.getOptions(cad.options);
                    const types = infoObj[key].map((v) => (typeof v === "string" ? v : v.type));
                    for (const cad2 of others) {
                        if (intersection(this.getTypes(cad2), types).length < 1) {
                            continue;
                        }
                        const options2 = this.getOptions(cad2.options);
                        let found = true;
                        for (const key2 in options1) {
                            if (!options2[key2] || options2[key2].length < 1) {
                                continue;
                            }
                            if (intersection(options1[key2], options2[key2]).length < 1) {
                                found = false;
                                break;
                            }
                        }
                        if (found) {
                            othersIds.add(cad2.id);
                            arr.push(cad2.clone(true));
                        }
                    }
                });
            }
            groupedCads.push(null);
            groupedCads.push(others.filter((v) => !othersIds.has(v.id)));
        } else {
            cads.forEach((cad, i) => {
                if (i % cols === 0) {
                    groupedCads.push([cad]);
                } else {
                    groupedCads[groupedCads.length - 1]?.push(cad);
                }
            });
        }

        const rect = new Rectangle();
        const ids = [] as string[];
        const dividers = [] as number[];
        let result: CadData;
        const isXinghao = !!xinghaoInfo;
        if (sourceCad) {
            result = sourceCad;
            rect.copy(sourceCad.entities.getBoundingRect());
        } else {
            result = new CadData();
        }
        result.info.version = CadVersion.DXF2010;
        const toRemove = new Set(Object.keys(importResult?.sourceCadMap.cads || []));
        groupedCads.forEach((group, i) => {
            if (group === null) {
                dividers.push(rect.bottom - margin / 2);
                return;
            }

            const group2 = [] as CadData[];
            const right = rect.right + padding;
            const draw = (cad: CadData, j: number, isGroup2: boolean) => {
                this._addLeaders(cad);
                const cadRect = cad.getBoundingRect();
                let offsetX = j * (width + margin);
                let offsetY = -(i - dividers.length) * (height + margin);
                if (isGroup2) {
                    offsetX += right + margin + 1000;
                    offsetY += rect.top - (offsetY + height);
                }
                const translate = new Point(offsetX + (width - cadRect.width - padding * 2) / 2, offsetY + height - padding);
                translate.sub(cadRect.left, cadRect.top);
                cad.transform({translate}, true);
                cadRect.transform({translate});

                const texts = [`唯一码: ${cad.info.唯一码}`];
                const {cadFields, skipFields} = this;
                for (const key in cadFields) {
                    if (skipFields.includes(key)) {
                        continue;
                    }
                    const value = cad[cadFields[key]];
                    const defaultValue = emptyData[cadFields[key]];
                    if (!isEqual(value, defaultValue)) {
                        if (typeof value === "boolean") {
                            texts.push(`${key}: ${value ? "是" : "否"}`);
                        } else if (Array.isArray(value)) {
                            texts.push(`${key}: ${value.join(",")}`);
                        } else {
                            texts.push(`${key}: ${value}`);
                        }
                    }
                }
                for (const optionName in cad.options) {
                    if (isXinghao && optionName === "型号") {
                        continue;
                    }
                    texts.push(`${optionName}: ${cad.options[optionName]}`);
                }
                const zhankaiStr = cad.zhankai
                    .map((v) => {
                        const arr = [v.zhankaikuan, v.zhankaigao, v.shuliang];
                        if (v.conditions.length > 0) {
                            arr.push(v.conditions[0]);
                        }
                        return `[${arr.join(", ")}]`;
                    })
                    .join(", ");
                texts.push(`展开: ${zhankaiStr}`);
                if (cad.shuangxiangzhewan) {
                    texts.push("双向折弯: 是");
                }
                for (const key of this.infoFields) {
                    if (key === "唯一码") {
                        continue;
                    }
                    const value = cad.info[key];
                    if (value) {
                        texts.push(`${key}: ${value}`);
                    }
                }

                if (importResult && !isGroup2) {
                    const uniqCode = cad.info.唯一码;
                    let found = false;
                    for (const cad2 of importResult.cads) {
                        const uniqCode2 = this.getUniqCode(cad2.data, isXinghao);
                        if (uniqCode === uniqCode2) {
                            found = true;
                            toRemove.delete(cad2.data.id);
                            const entities1 = cad.entities;
                            const entities2 = cad2.data.entities;
                            const rect1 = entities1.getBoundingRect();
                            const rect2 = entities2.getBoundingRect();
                            const dx = rect2.left - rect1.left;
                            const dy = rect2.top - rect1.top;
                            entities1.transform({translate: [dx, dy]}, true);
                            const text = importResult.sourceCadMap.cads[cad2.data.id].text;
                            result.entities.separate(entities2);
                            result.entities.merge(entities1);
                            for (const e of result.entities.mtext) {
                                if (e.id === text.id) {
                                    e.text = texts.join("\n");
                                    break;
                                }
                            }
                        }
                    }
                    if (!found) {
                        group2.push(cad);
                    }
                } else {
                    cad.entities.add(
                        new CadMtext({
                            text: texts.join("\n"),
                            insert: [offsetX + padding, cadRect.bottom - padding],
                            anchor: [0, 0]
                        })
                    );
                    const {line: lines, arc: arcs} = cad.getAllEntities();
                    [...lines, ...arcs].forEach((e) => this._addDimension(cad, e, exportIds));

                    let color: number;
                    if (ids.includes(cad.id)) {
                        color = 7;
                    } else {
                        ids.push(cad.id);
                        color = 3;
                    }
                    [
                        [0, 0, width, 0],
                        [width, 0, width, height],
                        [width, height, 0, height],
                        [0, height, 0, 0]
                    ].forEach((v) => {
                        const start = [v[0] + offsetX, v[1] + offsetY];
                        const end = [v[2] + offsetX, v[3] + offsetY];
                        cad.entities.add(new CadLine({color, start, end}));
                    });
                    rect.expandByPoint([offsetX, offsetY]);
                    rect.expandByPoint([offsetX + width, offsetY + height]);

                    result.entities.merge(cad.getAllEntities());
                }
            };
            group.forEach((cad, j) => draw(cad, j, false));
            group2.forEach((cad, j) => draw(cad, j, true));
        });
        if (importResult) {
            toRemove.forEach((id) => {
                const {entities, rectLines} = importResult.sourceCadMap.cads[id];
                entities.forEach((e) => result.entities.remove(e));
                rectLines.forEach((e) => result.entities.remove(e));
            });
        }

        dividers.forEach((y) => {
            const divider = new CadLine({color: 6});
            divider.start.set(rect.left - margin, y);
            divider.end.set(rect.right + margin, y);
            result.entities.add(divider);
        });

        if (importResult) {
            const {sourceCadMap} = importResult;
            if (xinghaoInfo) {
                let mtext = sourceCadMap.xinghaoInfo?.text;
                if (!mtext) {
                    mtext = new CadMtext();
                    mtext.anchor.set(0, 0);
                    mtext.insert.set(rect.left - 3000, rect.top);
                    mtext.font_size = 50;
                    result.entities.add(mtext);
                }
                const strs = [] as string[];
                this.xinghaoFields.forEach((field) => {
                    strs.push(`${field}: ${xinghaoInfo[field] || ""}`);
                });
                mtext.text = `型号配置: \n\n${strs.join("\n")}`;
            }
            if (slgses) {
                for (const slgs of slgses) {
                    const mtext = sourceCadMap.slgses[slgs.名字].text;
                    if (mtext) {
                        const obj = {名字: slgs.名字, 分类: slgs.分类, 条件: slgs.条件} as ObjectOf<string>;
                        for (const optionName in slgs.选项) {
                            if (isXinghao && optionName === "型号") {
                                continue;
                            }
                            obj[optionName] = slgs.选项[optionName];
                        }
                        mtext.text = "";
                        for (const key in obj) {
                            mtext.text += `${key}: ${obj[key]}\n`;
                        }
                        mtext.text += "算料公式:\n";
                        for (const key in slgs.公式) {
                            mtext.text += `${key} = ${slgs.公式[key]}\n`;
                        }
                    }
                }
            }
        }
        return result;
    }

    static getTypes(cad: CadData) {
        let types = Array.from(new Set(cad.type.split(";").concat(cad.type2.split(";"))));
        if (intersection(types, ["锁企料", "扇锁企料"]).length === 2) {
            types = difference(types, ["锁企料"]);
        }
        return types;
    }

    static addLineId(cad: CadData) {
        const lineGroups = sortLines(cad);
        if (lineGroups.length < 1 || lineGroups.length > 2) {
            return;
        }
        lineGroups.sort((a, b) => {
            const {left: left1, top: top1} = new CadEntities().fromArray(a).getBoundingRect();
            const {left: left2, top: top2} = new CadEntities().fromArray(b).getBoundingRect();
            return left1 === left2 ? top1 - top2 : left1 - left2;
        });
        const uniqCode = cad.info.唯一码 || "";

        lineGroups.forEach((lines, i) => {
            const prefix = lineGroups.length > 1 ? `${uniqCode}-${i + 1}` : uniqCode;
            const l1 = lines[0];
            const l2 = lines[lines.length - 1];
            const p1 = new Point(l1.minX, l1.minY);
            const p2 = new Point(l2.minX, l2.minY);
            if (p1.x === p2.x ? p1.y > p2.y : p1.x > p2.x) {
                lines = lines.reverse();
            }
            lines.forEach((line, j) => {
                if (line.线id) {
                    return;
                }
                if (line.mingzi) {
                    line.线id = `${prefix}-${line.mingzi}`;
                } else {
                    line.线id = `${prefix}-${j + 1}`;
                }
            });
        });
    }

    static getOptionValues(str: string | undefined | null) {
        if (!str) {
            return [];
        }
        return str.split(";");
    }

    static getOptions(options: CadData["options"]) {
        const result: ObjectOf<string[]> = {};
        for (const key in options) {
            result[key] = this.getOptionValues(options[key]);
        }
        return result;
    }

    static hasPeiheCad(cads: CadData[], info: PeiheInfo, options: ObjectOf<string>) {
        if (typeof info === "string") {
            info = {type: info, options: {}};
        }
        const type = info.type;
        const {is, isNot} = info.options || {};
        const result: {options: ObjectOf<string[]>; value: boolean} = {options: {}, value: false};
        cads.forEach((cad) => {
            if (cad.type !== type && cad.type2 !== type) {
                return;
            }
            if (is) {
                for (const optionName in is) {
                    if (!is[optionName].includes(cad.options[optionName])) {
                        return;
                    }
                }
            }
            if (isNot) {
                for (const optionName in isNot) {
                    if (isNot[optionName].includes(cad.options[optionName])) {
                        return;
                    }
                }
            }
            for (const optionName in options) {
                const values1 = this.getOptionValues(options[optionName]);
                const values2 = this.getOptionValues(cad.options[optionName]);
                if (values2.length < 1 || cad.options[optionName] === "所有") {
                    continue;
                }
                if (intersection(values1, values2).length < 1) {
                    return;
                }
            }
            for (const optionName in options) {
                this.getOptionValues(cad.options[optionName]).forEach((v) => {
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

    static getUniqCode(cad: CadData, isXinghao: boolean) {
        const {name, type} = cad;
        const get = (key: string) => cad.options[key] || "";
        if (isXinghao) {
            return [type, get("型号"), get("开启"), get("门铰"), name].join("");
        } else {
            return [type, get("型号"), get("开启"), get("门扇厚度"), name].join("");
        }
    }

    private static _removeLeaders(cad: CadData) {
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

    private static _addLeaders(cad: CadData) {
        const arr = cad.zhidingweizhipaokeng;
        const lines = sortLines(cad)[0];
        if (!lines) {
            return;
        }

        const length = 32;
        const gap = 4;

        for (let i = 0; i < lines.length - 1; i++) {
            const e1 = lines[i];
            const e2 = lines[i + 1];
            let matched = false;
            const id1 = e1.id;
            const id2 = e2.id;
            for (const ids of arr) {
                if (intersection(ids, [id1, id2]).length === 2) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                continue;
            }
            const p1 = e1.start.clone();
            const p2 = e1.end.clone();
            const p3 = e2.end.clone();
            const p4 = p1.clone().sub(p2).normalize().add(p3.clone().sub(p2).normalize());
            const p5 = p2.clone().add(p4);
            const p6 = p2.clone().sub(p4);
            const center = p1.clone().add(p2).divide(2);
            let line: Line;
            if (p5.distanceTo(center) > p6.distanceTo(center)) {
                line = new Line(p5, p2);
            } else {
                line = new Line(p6, p2);
            }
            const theta = line.theta.rad;
            line.end.sub(new Point(Math.cos(theta), Math.sin(theta)).multiply(gap));
            line.start.copy(line.end.clone().sub(new Point(Math.cos(theta), Math.sin(theta)).multiply(length)));
            const leader = new CadLeader();
            leader.vertices = [line.end, line.start];
            leader.size = 15;
            leader.setColor("red");
            cad.entities.add(leader);
        }
    }

    private static _addDimension(cad: CadData, e: CadLineLike, exportIds: boolean) {
        const dimension = new CadDimension();
        dimension.layer = "line-info";
        dimension.dimstyle = "line-info";
        dimension.distance = 10;
        dimension.font_size = 0;
        dimension.setColor("red");
        dimension.entity1 = {id: e.id, location: "start"};
        dimension.entity2 = {id: e.id, location: "end"};

        const texts = [];
        if (exportIds) {
            if (e.线id) {
                texts.push(`{\\H0.1x;线id:${e.线id}}`);
            } else {
                texts.push(`{\\H0.1x;id:${e.id}}`);
            }
        }
        let mingzi = e.mingzi;
        const vars = cad.info.vars;
        if (vars) {
            for (const varName in vars) {
                if (vars[varName] === e.id) {
                    mingzi = varName;
                }
            }
        }
        const {qujian, gongshi} = e;
        const qujianMatch = qujian.match(/(\d+)[~-](\d+)/);
        let mingziAdded = false;
        if (qujianMatch) {
            const [left, right] = qujianMatch.slice(1);
            const leftNum = Number(left);
            const rightNum = Number(right);
            if (!isNaN(leftNum) && leftNum <= 0) {
                texts.push(`${mingzi}<=${right}`);
            } else if (!isNaN(rightNum) && rightNum >= 9999) {
                texts.push(`${mingzi}>=${left}`);
            } else {
                texts.push(`${mingzi}=${left}-${right}`);
            }
            mingziAdded = true;
        }
        if (gongshi) {
            texts.push(`${mingzi}=${gongshi}`);
            mingziAdded = true;
        }
        if (!mingziAdded) {
            texts.push(mingzi);
        }
        if (e.children.line.find((v) => v.宽高虚线)) {
            texts.push("显示斜线宽高");
        }
        if (e.显示线长) {
            texts.push(`显示线长: ${e.显示线长}`);
        }
        dimension.mingzi = texts.join("\n");
        if (dimension.mingzi.length > 0) {
            const e2 = e instanceof CadLine ? e : new CadLine({start: e.start, end: e.end});
            if (e2.isHorizontal()) {
                dimension.axis = "x";
            } else if (e2.isVertical()) {
                dimension.axis = "y";
            }
            cad.entities.add(dimension);
        }
    }
}
