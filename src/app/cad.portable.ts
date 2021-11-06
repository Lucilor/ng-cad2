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
    sortLines
} from "@cad-viewer";
import {keysOf, Line, ObjectOf, Point, Rectangle} from "@utils";
import Color from "color";
import {difference, intersection} from "lodash";
import {replaceChars} from "./app.common";

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

export interface SlgsInfo {
    data: Slgs;
    errors: string[];
}

export type SourceCadMap = ObjectOf<{
    rect: Rectangle;
    rectLines: CadLineLike[];
    entities: CadEntities;
}>;

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
        装配位置: "装配位置"
    };

    static slgsFields = ["名字", "分类", "条件", "选项", "算料公式"];
    static skipFields = ["模板放大"];

    static import(sourceCad: CadData, isSuanliao: boolean) {
        const lines = sourceCad.entities.line.filter((v) => v.color.rgbNumber() === 0x00ff00);
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

        const sourceCadMap: SourceCadMap = {};
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
            sourceCadMap[data.id] = {rect, rectLines: sorted[i], entities: new CadEntities()};
            return {data, errors: [], skipErrorCheck: new Set()};
        });
        const slgses: SlgsInfo[] = [];
        const {cadFields, slgsFields, skipFields} = this;
        const globalOptions: CadData["options"] = {};
        sourceCad.getAllEntities().forEach((e) => {
            if (lineIds.includes(e.id)) {
                return;
            }
            if (e instanceof CadMtext) {
                const text = replaceChars(e.text);
                if (isSuanliao) {
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
                const xinghaoMatch = text.match(/^型号[:]?([\w\W]*)/);
                if (xinghaoMatch) {
                    globalOptions.型号 = xinghaoMatch[1].trim();
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
                    sourceCadMap[cads[i].data.id].entities.add(e);
                }
            });
        });

        const infoKeys = ["唯一码", "修改包边正面宽规则", "锁边自动绑定可搭配铰边"];

        cads.forEach((cad) => {
            const data = cad.data;
            let toRemove = -1;
            this._removeLeaders(data);
            data.info.errors = [];
            data.options = {...globalOptions};
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
            [...data.entities.line, ...data.entities.arc].forEach((e) => {
                const varName = e.info.varName;
                if (varName) {
                    data.info.vars[varName] = e.id;
                }
                delete e.info.varName;
            });
            generateLineTexts(data);
        });
        return {cads, slgses, sourceCadMap};
    }

    static export(cads: CadData[], type: ExportType, exportIds: boolean) {
        const result = new CadData();
        result.info.version = CadVersion.DXF2010;
        const margin = 300;
        const padding = 80;
        const width = 855;
        const height = 1700;
        const cols = 10;
        cads = cads.filter((v) => v.entities.length > 0 && Object.keys(v.options).length > 0);

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
        groupedCads.forEach((group, i) => {
            if (group === null) {
                dividers.push(rect.bottom - margin / 2);
                return;
            }

            group.forEach((cad, j) => {
                this._addLeaders(cad);
                const cadRect = cad.getBoundingRect();
                const offsetX = j * (width + margin);
                const offsetY = -(i - dividers.length) * (height + margin);
                const translate = new Point(offsetX + (width - cadRect.width - padding * 2) / 2, offsetY + height - padding);
                translate.sub(cadRect.left, cadRect.top);
                cad.transform({translate}, true);
                cadRect.transform({translate});

                const texts = [`唯一码: ${cad.info.唯一码}`];
                const {cadFields, skipFields} = CadPortable;
                for (const key in cadFields) {
                    if (skipFields.includes(key)) {
                        continue;
                    }
                    const value = cad[cadFields[key]];
                    if (typeof value === "string" && value) {
                        texts.push(`${key}: ${value}`);
                    } else if (typeof value === "boolean") {
                        texts.push(`${key}: ${value ? "是" : "否"}`);
                    }
                }
                texts.push(`条件: ${cad.conditions.join(",")}`);
                for (const optionName in cad.options) {
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
                if (cad.info.修改包边正面宽规则) {
                    texts.push(`\n修改包边正面宽规则: \n${cad.info.修改包边正面宽规则}`);
                }
                if (cad.info.锁边自动绑定可搭配铰边) {
                    texts.push(`锁边自动绑定可搭配铰边: \n${cad.info.锁边自动绑定可搭配铰边}`);
                }
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
                rect.expand(new Point(offsetX, offsetY));
                rect.expand(new Point(offsetX + width, offsetY + height));

                result.entities.merge(cad.getAllEntities());
            });
        });

        dividers.forEach((y) => {
            const divider = new CadLine({color: 6});
            divider.start.set(rect.left - margin, y);
            divider.end.set(rect.right + margin, y);
            result.entities.add(divider);
        });
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
            leader.color = new Color("red");
            cad.entities.add(leader);
        }
    }

    private static _addDimension(cad: CadData, e: CadLineLike, exportIds: boolean) {
        const dimension = new CadDimension();
        dimension.layer = "line-info";
        dimension.dimstyle = "line-info";
        dimension.distance = 10;
        dimension.font_size = 0;
        dimension.color = new Color("red");
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
