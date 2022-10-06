import {
    CadBaseLine,
    CadCircle,
    CadData,
    CadDimension,
    CadImage,
    CadJointPoint,
    CadLeader,
    CadLine,
    CadLineLike,
    CadMtext,
    CadViewer,
    CadViewerConfig,
    findAllAdjacentLines,
    generatePointsMap,
    getLinesDistance,
    sortLines
} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {DEFAULT_TOLERANCE, isBetween, Line, ObjectOf, Point} from "@utils";
import {intersection} from "lodash";
import {CadCollection} from "./app.common";
import {Formulas} from "./utils/calc";

export const reservedDimNames = ["前板宽", "后板宽", "小前板宽", "小后板宽", "骨架宽", "小骨架宽", "骨架中空宽", "小骨架中空宽"];

export const maxLineLength = 130;

export interface CadPreviewRawParams {
    fixedLengthTextSize?: number;
    fixedDimTextSize?: number;
    fixedMtextSize?: number;
    config?: Partial<CadViewerConfig>;
    autoSize?: boolean;
    maxZoom?: number;
}
export const getCadPreviewRaw = async (collection: CadCollection, data: CadData, params: CadPreviewRawParams = {}) => {
    const shiyitu = isShiyitu(data);
    const cad = new CadViewer(new CadData(), {
        width: 300,
        height: 150,
        padding: [5],
        backgroundColor: "rgba(0,0,0,0)",
        hideLineLength: collection === "CADmuban" || shiyitu,
        hideLineGongshi: true,
        ...params.config
    });
    cad.appendTo(document.body);
    await prepareCadViewer(cad);
    cad.data = data.clone();
    if (shiyitu) {
        cad.data.entities.dimension = [];
    }
    if (collection !== "cad") {
        cad.data.entities.mtext = [];
    }
    await cad.render();
    if (params.autoSize) {
        const {width, height} = cad.data.getBoundingRect();
        cad.resize(width, height);
    }
    cad.center();

    const {fixedLengthTextSize, fixedDimTextSize, fixedMtextSize} = params;
    if ([fixedLengthTextSize, fixedDimTextSize, fixedMtextSize].some((size) => size !== undefined)) {
        const resize = () => {
            const zoom = cad.zoom();
            const lengthTextSize = typeof fixedLengthTextSize === "number" ? fixedLengthTextSize / zoom : null;
            const dimTextSize = typeof fixedDimTextSize === "number" ? fixedDimTextSize / zoom : null;
            const mtextSize = typeof fixedMtextSize === "number" ? fixedMtextSize / zoom : null;
            cad.data.entities.forEach((e) => {
                if (e instanceof CadLineLike && lengthTextSize !== null) {
                    e.lengthTextSize = lengthTextSize;
                    e.children.mtext.forEach((mtext) => {
                        mtext.info.offset = [0, 0];
                    });
                    cad.render(e);
                } else if (e instanceof CadDimension && dimTextSize !== null) {
                    e.setStyle({text: {size: dimTextSize}});
                    cad.render(e);
                } else if (e instanceof CadMtext && mtextSize !== null) {
                    e.fontStyle.size = mtextSize;
                    cad.render(e);
                }
            });
            cad.center();
        };
        resize();
        resize();
    }
    const maxZoom = params.maxZoom;
    if (typeof maxZoom === "number" && !isNaN(maxZoom) && cad.zoom() > maxZoom) {
        cad.zoom(maxZoom);
    }
    return cad;
};

export interface CadPreviewParams extends CadPreviewRawParams {
    http?: CadDataService;
    useCache?: boolean;
}
export const getCadPreview = async (collection: CadCollection, data: CadData, params: CadPreviewParams = {}) => {
    const {http, useCache} = params;
    let url: string | null;
    if (http) {
        url = await http.getCadImg(data.id, useCache, {silent: true});
        if (url) {
            return url;
        }
    }
    const cad = await getCadPreviewRaw(collection, data, params);
    url = await cad.toDataURL();
    if (http) {
        http.setCadImg(data.id, url, {silent: true});
    }
    cad.destroy();
    return url;
};

export const prepareCadViewer = async (cad: CadViewer) => {
    await cad.loadFont({name: "喜鸿至简特殊字体", url: "assets/fonts/xhzj_sp.ttf"});
};

export const setCadData = (data: CadData, project: string) => {
    if (data.baseLines.length < 1) {
        data.baseLines.push(new CadBaseLine());
    }
    if (data.jointPoints.length < 1) {
        data.jointPoints.push(new CadJointPoint());
    }
    if (data.算料单线长显示的最小长度 === null) {
        data.算料单线长显示的最小长度 = project === "yhmy" ? 5 : 6;
    }
    if (isShiyitu(data)) {
        data.info.skipSuanliaodanZoom = true;
    } else {
        delete data.info.skipSuanliaodanZoom;
    }
    data.entities.forEach((e) => {
        if (e.layer === "分页线") {
            e.calcBoundingRect = false;
        }
    });
};

export interface ValidateResult {
    valid: boolean;
    errMsg: string[];
    lines: CadLineLike[][];
}

export const isShiyitu = (data: CadData) => data.type.includes("示意图") || data.type2.includes("示意图");

export const LINE_LIMIT = [0.01, 0.1];
export const validColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff"];
export const validateLines = (data: CadData, tolerance = DEFAULT_TOLERANCE): ValidateResult => {
    if (isShiyitu(data) || data.shuangxiangzhewan) {
        return {valid: true, errMsg: [], lines: []};
    }
    const lines = sortLines(data, tolerance);
    const result: ValidateResult = {valid: true, errMsg: [], lines};
    const [min, max] = LINE_LIMIT;
    const groupMaxLength = data.shuangxiangzhewan ? 2 : 1;
    lines.forEach((v) =>
        v.forEach((vv) => {
            const {start, end} = vv;
            const dx = Math.abs(start.x - end.x);
            const dy = Math.abs(start.y - end.y);
            if (isBetween(dx, min, max) || isBetween(dy, min, max)) {
                vv.info.errors = ["斜率不符合要求"];
                result.errMsg.push(`线段斜率不符合要求(线长: ${vv.length.toFixed(2)})`);
            } else {
                vv.info.errors = [];
            }
        })
    );
    if (lines.length < 1) {
        result.valid = false;
        result.errMsg.push("没有线");
    } else if (lines.length > groupMaxLength) {
        result.valid = false;
        result.errMsg.push("CAD分成了多段或线重叠");
        for (let i = 0; i < lines.length - 1; i++) {
            const currGroup = lines[i];
            const nextGroup = lines[i + 1];
            const l1 = currGroup[0];
            const l2 = currGroup[currGroup.length - 1];
            const l3 = nextGroup[0];
            const l4 = nextGroup[nextGroup.length - 1];
            let minD = Infinity;
            let errLines: CadLineLike[] = [];
            [
                [l1, l3],
                [l1, l4],
                [l2, l3],
                [l2, l4]
            ].forEach((group) => {
                const d = getLinesDistance(group[0], group[1]);
                if (d < minD) {
                    minD = d;
                    errLines = group;
                }
            });
            errLines.forEach((l) => {
                if (!l.info.errors.includes("CAD分成了多段的断裂处")) {
                    l.info.errors.push("CAD分成了多段的断裂处");
                }
            });
        }
    }
    return result;
};

export const autoFixLine = (cad: CadViewer, line: CadLine, tolerance = DEFAULT_TOLERANCE) => {
    const {start, end} = line;
    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const [min, max] = LINE_LIMIT;
    const translate = new Point();
    if (isBetween(Math.abs(dx), min, max)) {
        translate.x = dx;
    }
    if (isBetween(Math.abs(dy), min, max)) {
        translate.y = dy;
    }
    const map = generatePointsMap(cad.data.getAllEntities(), tolerance);
    const {entities} = findAllAdjacentLines(map, line, line.end, tolerance);
    entities.forEach((e) => e.transform({translate}, true));
    line.end.add(translate);
};

export const suanliaodanZoomIn = (collection: CadCollection, data: CadData) => {
    if (collection === "luomatoucad") {
        return;
    }
    data.components.data.forEach((v) => {
        v.entities.forEach((e) => {
            e.calcBoundingRect = e.calcBoundingRect && e instanceof CadLineLike;
        });
        if (v.info.skipSuanliaodanZoom) {
            return;
        }
        const lastSuanliaodanZoom = v.info.lastSuanliaodanZoom ?? 1;
        const rect = v.getBoundingRect();
        if (!rect.isFinite) {
            return;
        }
        if (lastSuanliaodanZoom !== v.suanliaodanZoom) {
            v.info.lastSuanliaodanZoom = v.suanliaodanZoom;
            v.transform({scale: v.suanliaodanZoom / lastSuanliaodanZoom, origin: [rect.left, rect.top]}, true);
        }
    });
    data.updateComponents();
};

export const suanliaodanZoomOut = (collection: CadCollection, data: CadData) => {
    if (collection === "luomatoucad") {
        return;
    }
    data.components.data.forEach((v) => {
        if (v.info.skipSuanliaodanZoom) {
            return;
        }
        v.entities.forEach((e) => {
            e.calcBoundingRect = e.calcBoundingRect && e instanceof CadLineLike;
        });
        const lastSuanliaodanZoom = v.info.lastSuanliaodanZoom ?? 1;
        const rect = v.getBoundingRect();
        if (!rect.isFinite) {
            return;
        }
        if (lastSuanliaodanZoom !== 1) {
            delete v.info.lastSuanliaodanZoom;
            v.transform({scale: 1 / lastSuanliaodanZoom, origin: [rect.left, rect.top]}, true);
        }
    });
    data.updateComponents();
};

export const updateCadPreviewImg = async (data: CadData, mode: "pre" | "post", disabled: boolean) => {
    let cadImage = data.entities.image.find((e) => e.info.isPreviewImg);
    if (disabled) {
        if (cadImage) {
            cadImage.remove();
        }
        return [];
    }
    if (!cadImage && mode === "pre") {
        return [];
    }

    const finish = () => {
        data.entities.forEach((e) => {
            e.visible = false;
            e.calcBoundingRectForce = e.calcBoundingRect;
        });
        if (cadImage) {
            cadImage.calcBoundingRect = false;
            cadImage.calcBoundingRectForce = false;
            cadImage.visible = true;
        }
    };
    if (cadImage) {
        finish();
        return [];
    }
    cadImage = new CadImage();
    cadImage.layer = "预览图";
    cadImage.info.isPreviewImg = true;
    cadImage.anchor.set(0.5, 0.5);
    const cad = await getCadPreviewRaw("cad", data, {autoSize: true, config: {padding: [0]}});
    cadImage.url = await cad.toDataURL();
    const {x, y} = cad.data.getBoundingRect();
    cad.destroy();
    cadImage.position.set(x, y);
    data.entities.add(cadImage);

    finish();
    return [cadImage];
};

export const getCadTotalLength = (data: CadData) => {
    let length = 0;
    const entities = data.getAllEntities();
    entities.line.forEach((e) => (length += e.length));
    entities.arc.forEach((e) => (length += e.length));
    entities.circle.forEach((e) => (length += e.curve.length));
    return length;
};

export const splitShuangxiangCad = (data: CadData) => {
    if (!data.shuangxiangzhewan) {
        return null;
    }
    const lines = sortLines(data);
    return lines
        .map((v) => {
            const d = new CadData();
            d.entities.add(...v);
            return d;
        })
        .sort((a, b) => {
            const {width: w1, height: h1} = a.getBoundingRect();
            const {width: w2, height: h2} = b.getBoundingRect();
            return h1 / w1 - h2 / w2;
        });
};

export const showIntersections = (data: CadData, config: ObjectOf<string>) => {
    let skip = true;
    const intersectionsKeys = ["zhidingweizhipaokeng", "指定分体位置", "指定位置不折"] as const;
    for (const key of intersectionsKeys) {
        if (data[key].length > 0) {
            skip = false;
            break;
        }
    }
    if (skip) {
        return;
    }
    const sortedEntitiesGroups = sortLines(data);
    const drawing = {
        leader: {length: 32, gap: 4, size: 15},
        circle: {radius: 8, linetype: "DASHEDX2", linewidth: 2},
        text: {size: 20, text: "", offset: 0}
    };
    for (const key of intersectionsKeys) {
        const arr = data[key];
        for (const sortedEntities of sortedEntitiesGroups) {
            for (let i = 0; i < sortedEntities.length - 1; i++) {
                const e1 = sortedEntities[i];
                const e2 = sortedEntities[i + 1];
                let matched = false;
                const id1 = e1.id;
                const id2 = e2.id;
                for (const ids of arr) {
                    if (intersection([id1, id2], ids)) {
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    continue;
                }
                const p1 = e1.start;
                const p2 = e1.end;
                const p3 = e2.end;
                const p4 = p1.clone().sub(p2).normalize().add(p3.clone().sub(p2).normalize());
                const p5 = p2.clone().add(p4);
                const p6 = p2.clone().sub(p4);
                const center = new Line(p1, p3).middle;
                let line: Line;
                if (p5.distanceTo(center) > p6.distanceTo(center)) {
                    line = new Line(p5.clone(), p2.clone());
                } else {
                    line = new Line(p6.clone(), p2.clone());
                }
                const theta = line.theta.rad;
                const d = new Point(Math.cos(theta), Math.sin(theta));
                let drawLeader = false;
                let drawCircle = false;
                let drawText = false;
                let layer = "";
                if (key === "zhidingweizhipaokeng") {
                    line.end.sub(d.clone().multiply(drawing.leader.gap));
                    line.start.copy(line.end.clone().sub(d.clone().multiply(drawing.leader.length)));
                    const 指定位置刨坑表示方法 = config.指定位置刨坑表示方法 || "箭头";
                    if (指定位置刨坑表示方法 === "箭头") {
                        drawLeader = true;
                    } else if (指定位置刨坑表示方法 === "箭头+箭头旁文字") {
                        drawLeader = true;
                        drawText = true;
                    } else if (指定位置刨坑表示方法 === "虚线圆") {
                        drawCircle = true;
                    } else if (指定位置刨坑表示方法 === "虚线圆+旁边文字") {
                        drawCircle = true;
                        drawText = true;
                    }
                    layer = "指定位置刨坑";
                    drawing.text.text = "刨";
                    drawing.text.offset = 8;
                } else if (key === "指定位置不折") {
                    line.end.sub(d.clone().multiply(drawing.leader.gap));
                    line.start.copy(line.end.clone().sub(d.clone().multiply(drawing.leader.length)));
                    const 指定位置不折表示方法 = config.指定位置不折表示方法 || "箭头";
                    if (指定位置不折表示方法 === "箭头") {
                        drawLeader = true;
                    } else if (指定位置不折表示方法 === "箭头+箭头旁文字") {
                        drawLeader = true;
                        drawText = true;
                    } else if (指定位置不折表示方法 === "虚线圆") {
                        drawCircle = true;
                    } else if (指定位置不折表示方法 === "虚线圆+旁边文字") {
                        drawCircle = true;
                        drawText = true;
                    }
                    layer = "指定位置不折";
                    drawing.text.text = "不折";
                    drawing.text.offset = 8;
                } else if (key === "指定分体位置") {
                    layer = "分体";
                    drawCircle = true;
                    drawText = true;
                    drawing.text.text = "分";
                    drawing.text.offset = 3;
                }
                if (drawLeader) {
                    const leader = new CadLeader({
                        layer,
                        vertices: [line.end, line.start],
                        size: drawing.leader.size
                    });
                    data.entities.add(leader);
                }
                if (drawCircle) {
                    const radius = Math.min(drawing.circle.radius, p1.distanceTo(p2) / 2 - 1, p2.distanceTo(p3) / 2 - 1);
                    const circle = new CadCircle({
                        layer,
                        center: p2,
                        radius,
                        linetype: drawing.circle.linetype,
                        linewidth: drawing.circle.linewidth,
                        color: 5
                    });
                    data.entities.add(circle);
                }
                if (drawText) {
                    let anchor = [0, 0];
                    let insert = [0, 0];
                    if (drawLeader) {
                        anchor = [d.x > 0 ? 1 : 0, d.y < 0 ? 1 : 0];
                        insert = line.start.clone().sub(d.clone().multiply(drawing.text.offset)).toArray();
                    } else if (drawCircle) {
                        anchor = [d.x > 0 ? 1 : 0, d.y < 0 ? 1 : 0];
                        insert = p2.clone().sub(d.clone().multiply(drawing.text.offset)).toArray();
                    }
                    const text = new CadMtext({
                        layer,
                        insert,
                        text: drawing.text.text,
                        anchor,
                        font_size: drawing.text.size
                    });
                    data.entities.add(text);
                }
            }
        }
    }
};

export const setDimensionText = (e: CadDimension, materialResult: Formulas) => {
    const match = e.mingzi.match(/显示公式[ ]*[:：](.*)/);
    let 显示公式: string | null = null;
    if (match && match.length > 1) {
        显示公式 = match[1].trim();
    }
    let 活动标注 = false;
    if (显示公式 !== null) {
        if (isNaN(Number(显示公式)) && 显示公式 in materialResult) {
            显示公式 = String(materialResult[显示公式]);
        }
        e.mingzi = 显示公式;
    } else if (e.mingzi.includes("活动标注")) {
        活动标注 = true;
        e.mingzi = "<>";
    }
    return {显示公式, 活动标注};
};
