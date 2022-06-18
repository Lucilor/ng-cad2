import {
    CadData,
    CadViewerConfig,
    CadViewer,
    CadLineLike,
    CadLine,
    CadMtext,
    CadDimension,
    Defaults,
    CadBaseLine,
    CadJointPoint,
    sortLines,
    getLinesDistance,
    generatePointsMap,
    findAllAdjacentLines,
    CadCircle
} from "@cad-viewer";
import {HttpService} from "@modules/http/services/http.service";
import {isNearZero, isBetween, getDPI, getImageDataUrl, loadImage, DEFAULT_TOLERANCE, Point} from "@utils";
import {createPdf} from "pdfmake/build/pdfmake";
import {CadImage} from "src/cad-viewer/src/cad-data/cad-entity/cad-image";
import {CadDimensionStyle} from "src/cad-viewer/src/cad-data/cad-styles";
import {CadCollection} from "./app.common";

export const reservedDimNames = ["前板宽", "后板宽", "小前板宽", "小后板宽", "骨架宽", "小骨架宽", "骨架中空宽", "小骨架中空宽"];

export interface CadPreviewRawParams {
    fixedLengthTextSize?: number;
    config?: Partial<CadViewerConfig>;
    autoSize?: boolean;
    maxZoom?: number;
}
export const getCadPreviewRaw = async (collection: CadCollection, data: CadData, params: CadPreviewRawParams = {}) => {
    const fixedLengthTextSize = params.fixedLengthTextSize;
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
    if (fixedLengthTextSize) {
        const resize = () => {
            const zoom = cad.zoom();
            const lengthTextSize = fixedLengthTextSize / zoom;
            cad.data.entities.forEach((e) => {
                if (e instanceof CadLineLike) {
                    e.lengthTextSize = lengthTextSize;
                    e.children.mtext.forEach((mtext) => {
                        mtext.info.offset = [0, 0];
                        // if (mtext.info.offset) {
                        //     mtext.info.offset = mtext.info.offset.map((v) => v / zoom);
                        // }
                    });
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
    http?: HttpService;
}
export const getCadPreview = async (collection: CadCollection, data: CadData, params: CadPreviewParams = {}) => {
    const http = params.http;
    if (http) {
        const response = await http.post<{url: string | null}>("ngcad/getCadImg", {id: data.id}, {silent: true});
        if (response?.data?.url) {
            return response.data.url;
        }
    }
    const cad = await getCadPreviewRaw(collection, data, params);
    const url = await cad.toDataURL();
    cad.destroy();
    return url;
};

const drawDesignPics = async (data: CadData, urls: string[], margin: number, findLocator: boolean) => {
    const rectData = data.getBoundingRect();
    const rect = rectData.clone();

    const vLines: CadLine[] = [];
    const hLines: CadLine[] = [];
    data.entities.line.forEach((e) => {
        if (e.isVertical()) {
            vLines.push(e);
        } else if (e.isHorizontal()) {
            hLines.push(e);
        }
    });
    if (vLines.length < 1) {
        console.warn("模板没有垂直线");
        return;
    }
    if (hLines.length < 1) {
        console.warn("模板没有水平线");
        return;
    }
    vLines.sort((a, b) => a.start.x - b.start.x);
    hLines.sort((a, b) => a.start.y - b.start.y);
    let deleteEntities: boolean;

    if (findLocator) {
        const locatorIndex = data.entities.mtext.findIndex((e) => e.text === "#设计图#");
        const locator = data.entities.mtext[locatorIndex];
        if (!locator) {
            console.warn("没有找到设计图标识");
            return;
        }
        const {
            left: locatorLeft,
            right: locatorRight,
            top: locatorTop,
            bottom: locatorBottom,
            width: locatorWidth,
            height: locatorHeight
        } = locator.boundingRect;
        data.entities.mtext.splice(locatorIndex, 1);
        let leftLines: CadLine[] = [];
        let rightLines: CadLine[] = [];
        let topLines: CadLine[] = [];
        let bottomLines: CadLine[] = [];
        vLines.forEach((e) => {
            if (e.length < locatorHeight) {
                return;
            }
            if (e.maxY < locatorBottom || e.minY > locatorTop) {
                return;
            }
            if (e.minX < locatorLeft) {
                leftLines.push(e);
            }
            if (e.maxX > locatorRight) {
                rightLines.push(e);
            }
        });
        hLines.forEach((e) => {
            if (e.length < locatorWidth) {
                return;
            }
            if (e.maxX < locatorLeft || e.minX > locatorRight) {
                return;
            }
            if (e.minY < locatorTop) {
                bottomLines.push(e);
            }
            if (e.maxY > locatorBottom) {
                topLines.push(e);
            }
        });
        const instersects = (e: CadLine, es: CadLine[]) => es.some((e2) => e.curve.intersects(e2.curve));
        leftLines = leftLines.filter((e) => instersects(e, topLines) || instersects(e, bottomLines));
        rightLines = rightLines.filter((e) => instersects(e, topLines) || instersects(e, bottomLines));
        topLines = topLines.filter((e) => instersects(e, leftLines) || instersects(e, rightLines));
        bottomLines = bottomLines.filter((e) => instersects(e, leftLines) || instersects(e, rightLines));
        rect.left = leftLines[leftLines.length - 1].minX;
        rect.right = rightLines[0].maxX;
        rect.top = topLines[0].minY;
        rect.bottom = bottomLines[bottomLines.length - 1].maxY;
        deleteEntities = false;
    } else {
        rect.left = vLines[0].start.x;
        rect.right = vLines[vLines.length - 1].start.x;
        const vLinesMinLength = rect.height / 2;
        const vLines2 = vLines.filter((e) => e.length > vLinesMinLength);
        const vLinesDx = vLines2[vLines2.length - 1].start.x - vLines2[0].start.x;
        const hLines2 = hLines.filter((e) => isNearZero(e.length - vLinesDx, 1)).reverse();
        if (hLines2.length < 1) {
            console.warn("模板没有合适的线");
            return;
        }
        for (let i = 0; i < hLines2.length - 1; i++) {
            const l1 = hLines2[i];
            const l2 = hLines2[i + 1];
            if (l1.start.y - l2.start.y > 500) {
                rect.top = l1.start.y;
                break;
            }
        }
        rect.bottom = hLines2[hLines2.length - 1].start.y;
        deleteEntities = true;
    }

    const {top, bottom, left, right} = rect;
    if (deleteEntities) {
        data.entities = data.entities.filter((e) => {
            if (e instanceof CadMtext) {
                return !isBetween(e.insert.y, top, bottom);
            }
            if (e instanceof CadLine) {
                if (e.minX >= right || e.maxX <= left) {
                    return true;
                }
                if (e.isHorizontal()) {
                    return e.minY >= top || e.maxY <= bottom;
                } else if (e.isVertical()) {
                    if (e.maxY > top || e.minY < bottom) {
                        return true;
                    }
                    if (e.maxY === top || e.minY === bottom) {
                        return e.minX <= left || e.maxX >= right;
                    }
                    return false;
                }
            }
            const eRect = e.boundingRect;
            return eRect.left > right || eRect.right < left || eRect.top < bottom || eRect.bottom > top;
        });
    }

    let {width, height} = rect;
    const {x, y} = rect;
    let getX: (i: number) => number;
    let getY: (i: number) => number;
    if (rect.width > rect.height) {
        width = rect.width / urls.length;
        if (findLocator) {
            getX = (i) => right - width * i - margin * (i + 1);
        } else {
            getX = (i) => left + width / 2 + width * i;
        }
        getY = (i) => y;
    } else {
        height = rect.height / urls.length;
        getX = (i) => x;
        getY = (i) => top - height / 2 - height * i;
    }
    for (let i = 0; i < urls.length; i++) {
        const cadImage = new CadImage();
        cadImage.url = urls[i];
        if (findLocator) {
            cadImage.anchor.set(1, 0.5);
        } else {
            cadImage.anchor.set(0.5, 0.5);
        }
        cadImage.targetSize = new Point(width - margin * 2, height - margin * 2);
        cadImage.objectFit = "contain";
        cadImage.transform({translate: [getX(i), getY(i)]}, true);
        data.entities.add(cadImage);
    }
};

export const prepareCadViewer = async (cad: CadViewer) => {
    await cad.loadFont({name: "喜鸿至简特殊字体", url: "assets/fonts/xhzj_sp.ttf"});
};

interface GetWrapedTextOptions {
    maxLength: number;
    minLength?: number;
    indent?: number;
    separator?: string | RegExp;
}
const getWrapedTextOptions = (source: string, maxLength: number) => {
    const options: GetWrapedTextOptions = {maxLength};
    if (source.match(/(\d+(\.\d+)?)?[x×](\d+(\.\d+)?)?/)) {
        options.minLength = 1;
        options.indent = 4;
        options.separator = /[,，。:；]/;
    }
    return options;
};
const getWrapedText = (cad: CadViewer, source: string, mtext: CadMtext, options: GetWrapedTextOptions) => {
    const defaultOptions: Required<GetWrapedTextOptions> = {
        maxLength: 0,
        minLength: 0,
        indent: 0,
        separator: ""
    };
    const {maxLength, minLength, indent, separator} = {...defaultOptions, ...options};
    const sourceLength = source.length;
    let start = 0;
    let end = 1;
    const tmpText = mtext.clone(true);
    tmpText.text = source;
    cad.add(tmpText);
    const arr: string[] = [];
    const getIndentText = (t: string) => {
        if (indent > 0 && arr.length > 0) {
            return Array(indent).fill(" ").join("") + t;
        }
        return t;
    };
    while (end <= sourceLength) {
        tmpText.text = getIndentText(source.slice(start, end));
        cad.render(tmpText);
        if (tmpText.el && tmpText.el.width() < maxLength) {
            end++;
        } else {
            if (start === end - 1) {
                throw new Error("文字自动换行时出错");
            }
            let text = source.slice(start, end - 1);
            const text2 = source.slice(end - 1);
            if (text2.length <= minLength) {
                break;
            }
            if (separator) {
                for (let i = end - 2; i >= start; i--) {
                    if (source[i].match(separator)) {
                        end = i + 2;
                        text = source.slice(start, end - 1);
                        break;
                    }
                }
            }
            console.log(text);
            arr.push(getIndentText(text));
            start = end - 1;
        }
    }
    arr.push(getIndentText(source.slice(start)));
    cad.remove(tmpText);
    return arr;
};

export interface PrintCadsParams {
    cads: CadData[];
    config?: Partial<CadViewerConfig>;
    linewidth?: number;
    dimStyle?: CadDimensionStyle;
    designPics?: {urls: string[][]; margin: number; showSmall: boolean; showLarge: boolean};
    extra?: {拉手信息宽度?: number};
    url?: string;
}
/**
 * A4: (210 × 297)mm²
 *    =(8.26 × 11.69)in² (1in = 25.4mm)
 * 	  =(794 × 1123)px² (96dpi)
 */
export const printCads = async (params: PrintCadsParams) => {
    const cads = params.cads.map((v) => v.clone());
    const config = params.config || {};
    const linewidth = params.linewidth || 1;
    const dimStyle = params.dimStyle;
    const extra = params.extra || {};
    let [dpiX, dpiY] = getDPI();
    if (!(dpiX > 0) || !(dpiY > 0)) {
        console.warn("Unable to get screen dpi.Assuming dpi = 96.");
        dpiX = dpiY = 96;
    }
    const width = (210 / 25.4) * dpiX * 0.75;
    const height = (297 / 25.4) * dpiY * 0.75;
    const scaleX = 300 / dpiX / 0.75;
    const scaleY = 300 / dpiY / 0.75;
    const scale = Math.sqrt(scaleX * scaleY);
    const errors: string[] = [];

    const cadPrint = new CadViewer(new CadData(), {
        ...config,
        width: width * scaleX,
        height: height * scaleY,
        backgroundColor: "white",
        padding: [18 * scale],
        hideLineLength: true,
        hideLineGongshi: true,
        minLinewidth: 0
    }).appendTo(document.body);
    cadPrint.dom.style.opacity = "0";
    await prepareCadViewer(cadPrint);

    const imgs: string[] = [];
    for (let i = 0; i < cads.length; i++) {
        const data = cads[i];
        const es = data.getAllEntities().toArray();
        for (const e of es) {
            const colorNumber = e.getColor().rgbNumber();
            if (e instanceof CadLineLike && (colorNumber === 0x333333 || e.layer === "1")) {
                e.linewidth = linewidth;
            }
            if (e instanceof CadDimension) {
                e.linewidth = linewidth;
                e.selected = true;
                e.setStyle({
                    ...dimStyle,
                    dimensionLine: {color: "#505050", dashArray: Defaults.DASH_ARRAY},
                    extensionLines: {color: "#505050", length: 12},
                    arrows: {color: "#505050"}
                });
                if (colorNumber === 0xff00ff || e.layer === "门扇中间宽标注") {
                    e.setStyle({arrows: {hidden: true}});
                }
            } else if (e instanceof CadMtext) {
                const {text, insert} = e;
                if (e.text.includes("     ") && !isNaN(Number(e.text))) {
                    if (e.fontStyle.size === 24) {
                        insert.y += 3;
                        insert.x -= 7;
                    }
                    if (e.fontStyle.size === 22) {
                        insert.y += 3;
                        insert.x -= 7;
                    }
                    e.text = text.replace("     ", "");
                    e.fontStyle.family = "仿宋";
                    e.fontStyle.weight = "bolder";
                    if (typeof e.fontStyle.size === "number") {
                        e.fontStyle.size += 8;
                    }
                } else {
                    if (config.fontStyle?.family === "宋体") {
                        e.fontStyle.size = (e.fontStyle.size || 0) + 6;
                        insert.y -= 5;
                    } else {
                        insert.y -= 12;
                    }
                }
                if ((e.fontStyle.size || -1) < 24) {
                    e.fontStyle.weight = "bolder";
                }

                if (text.match(/^花件信息/)) {
                    // * 自动换行
                    let wrapedText = text.slice(4);
                    let lines = data.getAllEntities().line;
                    lines = lines.filter((ee) => ee.isVertical() && isBetween(insert.y, ee.minY, ee.maxY) && ee.start.x - insert.x > 50);
                    let dMin = Infinity;
                    for (const ee of lines) {
                        const d = ee.start.x - insert.x - 1;
                        if (dMin > d) {
                            dMin = d;
                        }
                    }
                    dMin += 8;
                    try {
                        wrapedText = wrapedText
                            .split("\n")
                            .map((v) => getWrapedText(cadPrint, v, e, getWrapedTextOptions(v, dMin)).join("\n"))
                            .join("\n");
                    } catch (error) {
                        console.warn("花件信息自动换行时出错");
                        console.warn(error);
                    }
                    e.text = wrapedText;
                }
            }
            if (colorNumber === 0x808080 || e.layer === "不显示") {
                e.visible = false;
            } else if (e.layer === "分体") {
                if (e instanceof CadCircle) {
                    e.linewidth = Math.max(1, e.linewidth - 1);
                    e.setColor("blue");
                    e.dashArray = [10, 3];
                }
            } else if (![0xff0000, 0x0000ff].includes(colorNumber)) {
                e.setColor(0);
            }
        }
        data.updatePartners().updateComponents();
        cadPrint.data = data;
        await cadPrint.reset().render();
        cadPrint.center();
        const {拉手信息宽度} = extra;
        if (typeof 拉手信息宽度 === "number" && 拉手信息宽度 > 0) {
            const 拉手信息 = data.entities.mtext.filter((v) => v.text.startsWith("拉手:")).sort((v) => v.insert.x - v.insert.y);
            for (const mtext of 拉手信息) {
                const {el, text} = mtext;
                if (el && el.width() >= 拉手信息宽度) {
                    try {
                        mtext.text = getWrapedText(cadPrint, text, mtext, getWrapedTextOptions(text, 拉手信息宽度)).join("\n     ");
                        cadPrint.render(mtext);
                    } catch (error) {
                        console.warn("拉手信息自动换行出错");
                        console.warn(error);
                    }
                }
            }
        }

        const designPics = params.designPics;
        let img: string | undefined;
        let img2: string | undefined;
        if (designPics) {
            const {urls, margin, showSmall, showLarge} = designPics;
            const currUrls = urls[i] || urls[0];
            if (Array.isArray(currUrls)) {
                const urls2: string[] = [];
                for (const url2 of currUrls) {
                    try {
                        urls2.push(getImageDataUrl(await loadImage(url2)));
                    } catch (error) {
                        errors.push(`无法加载设计图: ${url2}`);
                    }
                }
                if (urls2.length > 0) {
                    const data2 = data.clone();
                    if (showSmall) {
                        await drawDesignPics(data, urls2, margin, true);
                        await cadPrint.reset().render();
                        cadPrint.center();
                        img = await cadPrint.toDataURL();
                    } else {
                        img = await cadPrint.toDataURL();
                    }
                    if (showLarge) {
                        await drawDesignPics(data2, urls2, margin, false);
                        cadPrint.data = data2;
                        await cadPrint.reset().render();
                        cadPrint.center();
                        img2 = await cadPrint.toDataURL();
                    }
                }
            }
        }
        if (!img) {
            img = await cadPrint.toDataURL();
        }
        imgs.push(img);
        if (img2) {
            imgs.push(img2);
        }
    }

    cadPrint.destroy();
    const pdf = createPdf(
        {
            content: imgs.map((image) => ({image, width, height})),
            pageSize: "A4",
            pageMargins: 0
        },
        {}
    );
    const url = await new Promise<string>((resolve) => {
        pdf.getBlob((blob) => resolve(URL.createObjectURL(blob)));
    });
    return {url, errors};
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
    if (isShiyitu(data) || (data.shuangxiangzhewan && (!data.suanliaochuli.includes("开料") || data.info.使用模板开料))) {
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

export const suanliaodanZoomIn = (data: CadData) => {
    data.components.data.forEach((v) => {
        v.entities.forEach((e) => {
            e.calcBoundingRect = e.calcBoundingRect && (e instanceof CadLineLike || e instanceof CadImage);
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

export const suanliaodanZoomOut = (data: CadData) => {
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

export const updateCadPreviewImg = async (data: CadData, mode: "pre" | "post") => {
    let cadImage = data.entities.image.find((e) => e.info.isPreviewImg);
    if (!cadImage && mode === "pre") {
        return;
    }

    const finish = () => {
        data.entities.forEach((e) => {
            e.visible = false;
            e.calcBoundingRectForce = true;
        });
        if (cadImage) {
            cadImage.calcBoundingRect = false;
            cadImage.calcBoundingRectForce = false;
            cadImage.visible = true;
        }
    };
    if (cadImage) {
        finish();
        return;
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
};
// export const updateCadPreviewImg = async (data: CadData, http: HttpService, mode: "pre" | "post") => {
//     let cadImage = data.entities.image.find((e) => e.info.isPreviewImg);
//     if (!cadImage && mode === "pre") {
//         return null;
//     }
//     if (cadImage) {
//         cadImage.calcBoundingRect = false;
//         cadImage.calcBoundingRectForce = false;
//         return null;
//     }
//     if (!cadImage) {
//         cadImage = new CadImage();
//         cadImage.layer = "预览图";
//         cadImage.info.isPreviewImg = true;
//         cadImage.anchor.set(0.5, 0.5);
//     }
//     cadImage.url = await getCadPreview("cad", data, {http});
//     const {x, y, width, height} = data.getBoundingRect();
//     console.log(width, height);
//     cadImage.position.set(x, y);

//     data.entities.forEach((e) => {
//         e.visible = true;
//         e.calcBoundingRectForce = true;
//     });
//     cadImage.calcBoundingRect = false;
//     cadImage.calcBoundingRectForce = false;
//     cadImage.visible = true;
//     cadImage.targetSize = new Point(width, height);
//     data.entities.add(cadImage);
//     return cadImage;
// };
