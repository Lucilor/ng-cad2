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
  intersectionKeys,
  intersectionKeysTranslate,
  sortLines
} from "@cad-viewer";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {DEFAULT_TOLERANCE, isBetween, Line, ObjectOf, Point} from "@utils";
import {intersection} from "lodash";
import {CadCollection, remoteHost} from "./app.common";
import {cadOptions} from "./cad.options";
import {Formulas} from "./utils/calc";
import {getCalcZhankaiText} from "./utils/zhankai";

export const reservedDimNames = ["前板宽", "后板宽", "小前板宽", "小后板宽", "骨架宽", "小骨架宽", "骨架中空宽", "小骨架中空宽"];

export const maxLineLength = 130 as const;

export const 激光开料标记线类型 = ["短直线", "直角三角形", "等腰三角形"] as const;

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
  let url = "n/static/fonts/xhzj_sp.ttf";
  if (environment.production) {
    url = `${remoteHost}/${url}`;
  }
  await cad.loadFont({name: "喜鸿至简特殊字体", url});
};

export const setCadData = (data: CadData, project: string, collection: CadCollection) => {
  if (data.baseLines.length < 1) {
    data.baseLines.push(new CadBaseLine());
  }
  if (data.jointPoints.length < 1) {
    data.jointPoints.push(new CadJointPoint());
  }
  if (data.算料单线长显示的最小长度 === null) {
    data.算料单线长显示的最小长度 = project === "yhmy" ? 5 : 6;
  }
  if (isShiyitu(data) || collection === "luomatoucad") {
    data.info.skipSuanliaodanZoom = true;
  } else {
    delete data.info.skipSuanliaodanZoom;
  }
  data.entities.forEach((e) => {
    if (e.layer === "分页线") {
      e.calcBoundingRect = false;
    }
  });

  data.info.激光开料是否翻转 = !!data.info.激光开料是否翻转;
  if (!Array.isArray(data.info.激光开料标记线)) {
    data.info.激光开料标记线 = [];
  }

  const dataAny = data as ObjectOf<any>;
  for (const key in cadOptions) {
    if (!(key in dataAny)) {
      console.warn("Key error: " + key);
    }
    if (typeof dataAny[key] !== "string") {
      dataAny[key] = "";
    }
    const key2 = key as keyof typeof cadOptions;
    const values = cadOptions[key2].values.map((v) => (typeof v === "string" ? v : v.value));
    if (!values.includes(dataAny[key])) {
      dataAny[key] = cadOptions[key2].defaultValue;
    }
  }
  return data;
};

export const unsetCadData = (data: CadData) => {
  if (!data.info.激光开料是否翻转) {
    delete data.info.激光开料是否翻转;
  }
  if (data.info.激光开料标记线 && data.info.激光开料标记线.length < 1) {
    delete data.info.激光开料标记线;
  }
};

export interface ValidateResult {
  errors: string[];
  errorLines: CadLineLike[][];
}

export const getCadTypes = (data: CadData) => [...data.type.split("*"), ...data.type2.split("*")].filter(Boolean);

export const isShiyitu = (data: CadData) => getCadTypes(data).some((type) => /示意图|截面图/.test(type));

export const LINE_LIMIT = [0.01, 0.1] as const;
export const validColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff"] as const;
export const validateLines = (data: CadData, noInfo?: boolean, tolerance = DEFAULT_TOLERANCE) => {
  const result: ValidateResult = {errors: [], errorLines: []};
  if (isShiyitu(data) || data.type === "企料算料") {
    return result;
  }
  const lines = sortLines(data, tolerance);
  result.errorLines = lines;
  const [min, max] = LINE_LIMIT;
  const groupMaxLength = data.shuangxiangzhewan ? 2 : 1;
  const addInfoError = (e: CadLineLike, error: string) => {
    if (noInfo) {
      return;
    }
    if (!e.info.errors) {
      e.info.errors = [];
    }
    if (!e.info.errors.includes(error)) {
      e.info.errors.push(error);
    }
  };
  const slopeErrMax = 5;
  let slopeErrCount = 0;
  for (const v of lines) {
    let 刨坑起始线数量 = 0;
    let 刨坑起始线位置错误 = false;
    for (const [i, e] of v.entries()) {
      const {start, end} = e;
      const dx = Math.abs(start.x - end.x);
      const dy = Math.abs(start.y - end.y);
      if (e.刨坑起始线) {
        刨坑起始线数量++;
        if (i !== 0 && i !== v.length - 1) {
          刨坑起始线位置错误 = true;
        }
      }
      if (isBetween(dx, min, max) || isBetween(dy, min, max)) {
        addInfoError(e, "斜率不符合要求");
        slopeErrCount++;
        if (slopeErrCount < slopeErrMax) {
          result.errors.push(`线段斜率不符合要求(线长: ${e.length.toFixed(2)})`);
        } else if (slopeErrCount === slopeErrMax) {
          result.errors.push("分类包含【示意图】或者分类等于【企料算料】就不会报斜率错误, 请自行判断修改");
        }
      }
    }
    if (刨坑起始线数量 > 1) {
      result.errors.push("不能有多根刨坑起始线");
    }
    if (刨坑起始线位置错误) {
      result.errors.push("刨坑起始线必须是第一根或最后一根");
    }
  }
  if (lines.length < 1) {
    result.errors.push("没有线");
  } else if (lines.length > groupMaxLength) {
    result.errors.push("CAD分成了多段或线重叠");
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
        addInfoError(l, "CAD分成了多段的断裂处");
      });
    }
  }
  return result;
};

export const validateCad = (data: CadData, noInfo?: boolean, tolerance = DEFAULT_TOLERANCE) => {
  const result: ValidateResult = {errors: [], errorLines: []};
  const entities = data.getAllEntities();
  const idsAll = entities.toArray().map((e) => e.id);
  for (const key of intersectionKeys) {
    const idsToFind: string[] = data[key].flat();
    if (intersection(idsToFind, idsAll).length !== idsToFind.length) {
      result.errors.push(`${intersectionKeysTranslate[key]}存在无效数据`);
    }
  }
  const linesResult = validateLines(data, noInfo, tolerance);
  for (const key in result) {
    (result as any)[key].push(...(linesResult as any)[key]);
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

export const suanliaodanZoomIn = (data: CadData) => {
  if (!data.info.skipSuanliaodanZoom) {
    for (const v of data.components.data) {
      v.entities.forEach((e) => {
        e.calcBoundingRect = e.calcBoundingRect && e instanceof CadLineLike;
      });
      const lastSuanliaodanZoom = v.info.lastSuanliaodanZoom ?? 1;
      const rect = v.getBoundingRect();
      if (!rect.isFinite) {
        continue;
      }
      if (lastSuanliaodanZoom !== v.suanliaodanZoom) {
        v.info.lastSuanliaodanZoom = v.suanliaodanZoom;
        v.transform({scale: v.suanliaodanZoom / lastSuanliaodanZoom, origin: [rect.left, rect.top]}, true);
      }
    }
  }
  data.updateComponents();
};

export const suanliaodanZoomOut = (data: CadData) => {
  if (!data.info.skipSuanliaodanZoom) {
    for (const v of data.components.data) {
      v.entities.forEach((e) => {
        e.calcBoundingRect = e.calcBoundingRect && e instanceof CadLineLike;
      });
      const lastSuanliaodanZoom = v.info.lastSuanliaodanZoom ?? 1;
      const rect = v.getBoundingRect();
      if (!rect.isFinite) {
        continue;
      }
      if (lastSuanliaodanZoom !== 1) {
        delete v.info.lastSuanliaodanZoom;
        v.transform({scale: 1 / lastSuanliaodanZoom, origin: [rect.left, rect.top]}, true);
      }
    }
  }
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
  entities.line.forEach((e) => (length += e.info.线长 || e.length));
  entities.arc.forEach((e) => (length += e.length));
  entities.circle.forEach((e) => (length += e.curve.length));
  return length;
};

export const splitShuangxiangCad = (data: CadData) => {
  if (!data.shuangxiangzhewan) {
    return null;
  }
  const lines = sortLines(data);
  const result = lines
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
  if (result.length !== 2) {
    return null;
  }
  return result as [CadData, CadData];
};

export const getShuangxiangLineRects = (data: ReturnType<typeof splitShuangxiangCad>) => {
  if (!data) {
    return null;
  }
  const [a, b] = data;
  return [a.getBoundingRect(), b.getBoundingRect()];
};

export const setShuangxiangLineRects = (
  data: ReturnType<typeof splitShuangxiangCad>,
  rects: ReturnType<typeof getShuangxiangLineRects>
) => {
  if (!data || !rects) {
    return;
  }
  const rects2 = data.map((v) => v.getBoundingRect());
  for (let i = 0; i < rects.length; i++) {
    const rect1 = rects[i];
    const rect2 = rects2[i];
    const dx = rect1.x - rect2.x;
    const dy = rect1.y - rect2.y;
    data[i].transform({translate: [dx, dy]}, true);
  }
};

export const shouldShowIntersection = (data: CadData) => {
  for (const key of intersectionKeys) {
    if (data[key].filter((v) => v.length > 0).length > 0) {
      return true;
    }
  }
  return false;
};

export const showIntersections = (data: CadData, config: ObjectOf<string>) => {
  if (!shouldShowIntersection(data)) {
    return;
  }
  const sortedEntitiesGroups = sortLines(data);
  const rect = data.getBoundingRect();
  const rectCenter = new Point(rect.x, rect.y);
  const drawing = {
    leader: {length: 32, gap: 4, size: 15},
    circle: {radius: 8, linetype: "DASHEDX2", linewidth: 2},
    text: {size: 20, text: "", offset: 0}
  };
  for (const key of intersectionKeys) {
    const arr = data[key];
    for (const sortedEntities of sortedEntitiesGroups) {
      for (let i = 0; i < sortedEntities.length; i++) {
        const e1 = sortedEntities[i];
        const e2 = sortedEntities.at(i + 1);
        let matched = false;
        const id1 = e1.id;
        const id2 = e2?.id;
        let isStartPoint = false;
        let isEndPoint = false;
        for (const ids of arr) {
          if (ids.length === 1 && ids[0] === id1) {
            if (i === 0) {
              matched = true;
              isStartPoint = true;
            } else if (i === sortedEntities.length - 1) {
              matched = true;
              isEndPoint = true;
            }
            break;
          }
          if (intersection([id1, id2], ids).length === 2) {
            matched = true;
            break;
          }
        }
        if (!matched) {
          continue;
        }
        let p1: Point;
        let p2: Point;
        let p3: Point;
        if (isStartPoint) {
          p1 = rectCenter;
          p2 = e1.start;
          p3 = e1.end;
        } else if (isEndPoint) {
          p1 = e1.start;
          p2 = e1.end;
          p3 = rectCenter;
        } else {
          if (!e2) {
            continue;
          }
          p1 = e1.start;
          p2 = e1.end;
          p3 = e2.end;
        }
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
            size: drawing.leader.size,
            info: {isIntersectionEntity: true}
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
            color: 5,
            info: {isIntersectionEntity: true}
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
            font_size: drawing.text.size,
            info: {isIntersectionEntity: true}
          });
          data.entities.add(text);
        }
      }
    }
  }
};

export const removeIntersections = (data: CadData) => {
  data.entities = data.entities.filter((entity) => !entity.info?.isIntersectionEntity);
};

export const setDimensionText = (e: CadDimension, materialResult: Formulas) => {
  if (!(typeof e.mingzi === "string")) {
    e.mingzi = String(e.mingzi);
  }
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

export const getCadCalcZhankaiText = (
  cad: CadData,
  calcZhankai: any[],
  materialResult: ObjectOf<any>,
  bancai: {mingzi?: string; cailiao?: string; houdu?: string; zidingyi?: string},
  项目配置: ObjectOf<string>,
  项目名: string
) => {
  const CAD来源 = "算料";
  let 板材 = bancai.mingzi || "";
  if (bancai && 板材 === "自定义") {
    板材 = bancai.zidingyi || "";
  }
  const 板材厚度 = bancai.houdu || "";
  const 材料 = bancai.cailiao || "";
  const CAD属性 = {
    name: cad.name,
    suanliaodanxianshibancai: cad.suanliaodanxianshibancai,
    shuangxiangzhewan: cad.shuangxiangzhewan,
    算料单展开显示位置: cad.算料单展开显示位置,
    算料特殊要求: cad.算料特殊要求,
    suanliaodanxianshi: cad.suanliaodanxianshi,
    suanliaochuli: cad.suanliaochuli,
    kailiaoshibaokeng: cad.kailiaoshibaokeng,
    zhidingweizhipaokeng: cad.zhidingweizhipaokeng,
    gudingkailiaobancai: cad.gudingkailiaobancai,
    houtaiFenlei: cad.type,
    bancaiwenlifangxiang: cad.bancaiwenlifangxiang,
    zhankai: cad.zhankai,
    overrideShuliang: undefined,
    xianshimingzi: cad.xianshimingzi,
    attributes: cad.attributes
  };

  const text = getCalcZhankaiText(CAD来源, calcZhankai, materialResult, 板材, 板材厚度, 材料, 项目配置, 项目名, CAD属性);
  return text;
};
