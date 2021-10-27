import {
    CadArc,
    CadCircle,
    CadData,
    CadDimension,
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
import {Line, ObjectOf, Point, Rectangle} from "@utils";
import {ImportComponentCad, ImportComponentSlgs} from "@views/import/import.component";
import Color from "color";
import {intersection} from "lodash";
import {replaceChars} from "./app.common";

export interface Slgs {
    名字: string;
    分类: string;
    条件: string[];
    选项: ObjectOf<string>;
    公式: ObjectOf<string>;
}

export class CadPortable {
    static cadFields: ObjectOf<keyof CadData> = {
        名字: "name",
        分类: "type",
        分类2: "type2",
        全部刨坑: "kailiaoshibaokeng",
        变形方式: "bianxingfangshi",
        板材纹理方向: "bancaiwenlifangxiang",
        开料排版方式: "kailiaopaibanfangshi",
        默认开料板材: "morenkailiaobancai",
        算料处理: "suanliaochuli",
        显示宽度标注: "showKuandubiaozhu",
        双向折弯: "shuangxiangzhewan",
        算料特殊要求: "算料特殊要求",
        算料单显示: "suanliaodanxianshi"
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

        // this.sourceCad = sourceCad;
        // this._sourceCadMap = {};
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

        const cads: ImportComponentCad[] = rects.map((rect, i) => {
            const data = new CadData();
            // this._sourceCadMap[data.id] = {rect, rectLines: sorted[i], entities: new CadEntities()};
            return {data, errors: [], skipErrorCheck: new Set()};
        });
        const slgses: ImportComponentSlgs[] = [];
        const {cadFields, slgsFields, skipFields} = this;
        sourceCad.getAllEntities().forEach((e) => {
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
                    // this._sourceCadMap[cads[i].data.id].entities.add(e);
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

    static export(cads: CadData[], exportIds: boolean) {
        const result = new CadData();
        result.info.version = CadVersion.DXF2010;
        const margin = 300;
        const padding = 80;
        const width = 855;
        const height = 1700;
        const cols = 10;

        const join = (cad: CadData, i: number) => {
            this._addLeaders(cad);
            const rect = cad.getBoundingRect();
            const offsetX = (i % cols) * (width + margin);
            const offsetY = -Math.floor(i / cols) * (height + margin);
            const translate = new Point(offsetX + (width - rect.width - padding * 2) / 2, offsetY + height - padding);
            translate.sub(rect.left, rect.top);
            cad.transform({translate}, true);
            rect.transform({translate});

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
                    insert: [offsetX + padding, rect.bottom - padding],
                    anchor: [0, 0]
                })
            );

            const {line: lines, arc: arcs} = cad.getAllEntities();
            [...lines, ...arcs].forEach((e) => this._addDimension(cad, e, exportIds));

            [
                [0, 0, width, 0],
                [width, 0, width, height],
                [width, height, 0, height],
                [0, height, 0, 0]
            ].forEach((v) => {
                const start = [v[0] + offsetX, v[1] + offsetY];
                const end = [v[2] + offsetX, v[3] + offsetY];
                cad.entities.add(new CadLine({color: 3, start, end}));
            });

            result.entities.merge(cad.getAllEntities());
        };

        // for (let i = 0; i < total; i += step) {
        //     const end = Math.min(total, i + step);
        //     const currIds = ids.slice(i, end);
        //     if (i + 1 === end) {
        //         this.msg = `正在导出数据(${end}/${total})`;
        //     } else {
        //         this.msg = `正在导出数据((${i + 1}~${end})/${total})`;
        //     }
        //     const data = await this.dataService.queryMongodb({collection: "cad", where: {_id: {$in: currIds}}, genUnqiCode: true});
        //     data.forEach((v) => cads.push(new CadData(v.json)));
        //     this.progressBar.forward(end - i);
        // }
        const keys: string[] = ["锁边", "铰边", "开启", "包边"];
        cads.sort((a, b) => {
            for (const k of keys) {
                const v1 = a.options[k];
                const v2 = b.options[k];
                if (v1 !== v2) {
                    return v1 > v2 ? 1 : -1;
                }
            }
            if (a.name !== b.name) {
                return a.name > b.name ? 1 : -1;
            }
            return 0;
        }).forEach((v, i) => join(v, i));

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
            texts.push(`{\\H0.1x;id:${e.id}}`);
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
