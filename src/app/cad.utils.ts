import {
    CadData,
    CadViewerConfig,
    CadViewer,
    CadDimension,
    CadLineLike,
    CadMtext,
    CadZhankai,
    CadBaseLine,
    CadJointPoint,
    getLinesDistance,
    sortLines,
    CadLine,
    generatePointsMap,
    findAllAdjacentLines
} from "@cad-viewer";
import {timeout, getDPI, Point, isNearZero, loadImage, isBetween, DEFAULT_TOLERANCE} from "@utils";
import Color from "color";
import {createPdf} from "pdfmake/build/pdfmake";

export const reservedDimNames = ["前板宽", "后板宽", "小前板宽", "小后板宽", "骨架宽", "小骨架宽", "骨架中空宽", "小骨架中空宽"];

export interface CadPreviewParams {
    fixedLengthTextSize?: number;
}
export const getCadPreview = async (data: CadData, config: Partial<CadViewerConfig> = {}, params: CadPreviewParams = {}) => {
    const fixedLengthTextSize = params.fixedLengthTextSize;
    const cad = new CadViewer(new CadData(), {
        width: 300,
        height: 150,
        padding: [10],
        backgroundColor: "black",
        hideLineLength: true,
        hideLineGongshi: true,
        ...config
    });
    cad.appendTo(document.body);
    await prepareCadViewer(cad);
    cad.data = data.clone();
    cad.render().center();
    // ? ?? ???
    await timeout(0);
    cad.center();
    if (fixedLengthTextSize) {
        const resize = () => {
            const zoom = cad.zoom();
            cad.data.entities.forEach((e) => {
                if (e instanceof CadLineLike) {
                    e.lengthTextSize = fixedLengthTextSize / zoom;
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
    const src = cad.toBase64();
    cad.destroy();
    return src;
};

const drawDesignPics = async (muban: CadData, mubanUrl: string, urls: string[], margin: number) => {
    const img = await loadImage(mubanUrl);
    const rectData = muban.getBoundingRect();
    const rect = rectData.clone();
    const lines = muban.entities.line.filter((line) => line.isHorizontal() && isNearZero(line.length - rectData.width, 1));
    lines.sort((a, b) => b.start.y - a.start.y);
    for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].start.y - lines[i + 1].start.y > 500) {
            rect.top = lines[i].start.y;
            break;
        }
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("failed to get 2d context of canvas");
    }
    const {width, height} = img;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = "100%";
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const getColor = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return imageData.data.slice(i, i + 4);
    };
    const isBlank = (color: Uint8ClampedArray) => {
        const [r, g, b, a] = color;
        return a === 0 || (r === 255 && g === 255 && b === 255);
    };
    let offsetX = 0;
    let offsetY = 0;
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    for (let x = 0; x < width; x++) {
        if (!isBlank(getColor(x, midY))) {
            offsetX = x;
            break;
        }
    }
    for (let y = 0; y < height; y++) {
        if (!isBlank(getColor(midX, y))) {
            offsetY = y;
            break;
        }
    }
    offsetX += 4;
    offsetY += 4;

    const yPercent1 = (rectData.top - rect.top) / rectData.height;
    const yPercent2 = (rectData.top - rect.bottom) / rectData.height;
    const hPercent = yPercent2 - yPercent1;
    const width2 = width - offsetX * 2;
    const height2 = (height - offsetY * 2) * hPercent;
    offsetY += (height - offsetY * 2) * yPercent1;
    ctx.fillStyle = "white";
    ctx.fillRect(offsetX, offsetY, width2, height2);

    const imgs: HTMLImageElement[] = [];
    for (const src of urls) {
        imgs.push(await loadImage(src));
    }

    const getDrawArea = (sw: number, sh: number, dw: number, dh: number) => {
        let x = 0;
        let y = 0;
        let w = 0;
        let h = 0;
        if (sw / sh > dw / dh) {
            w = dw - margin * 2;
            h = w * (sh / sw);
        } else {
            h = dh - margin * 2;
            w = h * (sw / sh);
        }
        x = (dw - w) / 2;
        y = (dh - h) / 2;
        return {x, y, w, h};
    };
    if (rectData.width > rectData.height) {
        const dw = width2 / imgs.length;
        const dh = height2;
        imgs.forEach((img2, i) => {
            const {width: sw, height: sh} = img2;
            const {x, y, w, h} = getDrawArea(sw, sh, dw, dh);
            ctx.drawImage(img2, 0, 0, sw, sh, x + offsetX + dw * i, y + offsetY, w, h);
        });
    } else {
        const dw = width2;
        const dh = height2 / imgs.length;
        imgs.forEach((img2, i) => {
            const {width: sw, height: sh} = img2;
            const {x, y, w, h} = getDrawArea(sw, sh, dw, dh);
            ctx.drawImage(img2, 0, 0, sw, sh, x + offsetX, y + offsetY + dh * i, w, h);
        });
    }

    return canvas.toDataURL();
};

export const prepareCadViewer = async (cad: CadViewer) => {
    await cad.loadFont({name: "喜鸿至简特殊字体", url: "assets/fonts/xhzj_sp.ttf"});
};

const getWrapedText = (cad: CadViewer, source: string, maxLength: number, mtext: CadMtext) => {
    const sourceLength = source.length;
    let start = 0;
    let end = 1;
    const tmpText = mtext.clone(true);
    tmpText.text = source;
    cad.add(tmpText);
    const arr: string[] = [];
    while (end <= sourceLength) {
        tmpText.text = source.slice(start, end);
        cad.render(tmpText);
        if (tmpText.el && tmpText.el.width() < maxLength) {
            end++;
        } else {
            if (start === end - 1) {
                throw new Error("文字自动换行时出错");
            }
            arr.push(source.slice(start, end - 1));
            start = end - 1;
        }
    }
    arr.push(source.slice(start));
    cad.remove(tmpText);
    return arr;
};

export interface PrintCadsParams {
    cads: CadData[];
    config?: Partial<CadViewerConfig>;
    linewidth?: number;
    renderStyle?: CadDimension["renderStyle"];
    designPics?: {urls: (string | string[])[]; margin: number};
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
    const renderStyle = params.renderStyle || 2;
    const designPics = params.designPics;
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
            const colorNumber = e.color.rgbNumber();
            if (colorNumber === 0x808080) {
                e.opacity = 0;
            } else if (colorNumber !== 0xff0000) {
                e.color = new Color(0);
            }
            if (e instanceof CadLineLike && (colorNumber === 0x333333 || e.layer === "1")) {
                e.linewidth = linewidth;
            }
            if (e instanceof CadDimension) {
                e.linewidth = linewidth;
                e.renderStyle = renderStyle;
                e.selected = true;
            } else if (e instanceof CadMtext) {
                const {text, insert} = e;
                if (e.text.includes("     ") && !isNaN(Number(e.text))) {
                    if (e.font_size === 24) {
                        e.font_size = 36;
                        insert.y += 11;
                        insert.x -= 4;
                    }
                    if (e.font_size === 22) {
                        e.font_size = 30;
                        insert.y += 11;
                        insert.x -= 4;
                    }
                    e.text = text.replace("     ", "");
                    e.fontFamily = "仿宋";
                    e.fontWeight = "bolder";
                } else {
                    if (config.fontFamily === "宋体") {
                        e.font_size += 6;
                        insert.y -= 5;
                    } else {
                        insert.y -= 12;
                    }
                }
                if (e.font_size < 24) {
                    e.fontWeight = "bolder";
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
                            .map((v) => getWrapedText(cadPrint, v, dMin, e).join("\n"))
                            .join("\n");
                    } catch (error) {
                        wrapedText = "花件信息自动换行时出错\n" + wrapedText;
                        e.color = new Color("red");
                    }
                    e.text = wrapedText;
                }
            }
        }
        cadPrint.reset();
        cadPrint.data = data;
        cadPrint.center().render();
        data.updatePartners().updateComponents();
        cadPrint.render().center();
        cadPrint.draw.find("[type='DIMENSION']").forEach((el) => {
            el.children().forEach((child) => {
                if (child.node.tagName === "text") {
                    return;
                }
                if (child.hasClass("stroke")) {
                    child.stroke("#505050");
                }
                if (child.hasClass("fill")) {
                    child.fill("#505050");
                }
            });
        });
        const {拉手信息宽度} = extra;
        if (typeof 拉手信息宽度 === "number" && 拉手信息宽度 > 0) {
            for (const cad of cads) {
                const 拉手信息 = cad.entities.mtext.filter((v) => v.text.startsWith("拉手:")).sort((v) => v.insert.x - v.insert.y);
                for (const mtext of 拉手信息) {
                    const {el, text} = mtext;
                    if (el && el.width() >= 拉手信息宽度) {
                        try {
                            mtext.text = getWrapedText(cadPrint, text, 拉手信息宽度, mtext).join("\n     ");
                            cadPrint.render(mtext);
                        } catch (error) {
                            console.warn("拉手信息自动换行出错");
                        }
                    }
                }
            }
        }
        const img = (await cadPrint.toCanvas()).toDataURL();
        imgs.push(img);
        if (designPics) {
            let designPicsGroup = designPics.urls[i];
            if (designPicsGroup) {
                if (typeof designPicsGroup === "string") {
                    designPicsGroup = [designPicsGroup];
                }
                imgs.push(await drawDesignPics(data, img, designPicsGroup, designPics.margin));
            }
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
    return url;
};

export const addCadGongshi = (data: CadData, visible: boolean, ignoreTop: boolean) => {
    removeCadGongshi(data);
    if (!ignoreTop) {
        const mtext = new CadMtext();
        const {left, bottom} = data.getBoundingRect();
        mtext.text = getCadGongshiText(data);
        mtext.insert = new Point(left, bottom - 30);
        mtext.selectable = false;
        mtext.font_size = 16;
        mtext.anchor.set(0, 0);
        mtext.info.isCadGongshi = true;
        mtext.visible = visible;
        data.entities.add(mtext);
    }
    data.partners.forEach((d) => addCadGongshi(d, visible, false));
    data.components.data.forEach((d) => addCadGongshi(d, visible, false));
    return data;
};

export const removeCadGongshi = (data: CadData) => {
    data.entities.mtext = data.entities.mtext.filter((e) => {
        if (e.info.isCadGongshi) {
            e.el?.remove();
            return false;
        }
        return true;
    });
    data.partners.forEach((d) => removeCadGongshi(d));
    data.components.data.forEach((d) => removeCadGongshi(d));
    return data;
};

export const getCadGongshiText = (data: CadData) => {
    const zhankai = data.zhankai.length > 0 ? data.zhankai[0] : new CadZhankai();
    const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = zhankai;
    let text = `${zhankaikuan} × ${zhankaigao} = ${shuliang}`;
    if (Number(shuliangbeishu) > 1) {
        text += " × " + shuliangbeishu;
    }
    return text;
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
    data.entities.dimension.forEach((e) => (e.color = new Color(0x00ff00)));
    data.partners.forEach((v) => setCadData(v, project));
    data.components.data.forEach((v) => setCadData(v, project));
};

export interface ValidateResult {
    valid: boolean;
    errMsg: string[];
    lines: CadLineLike[][];
}

export const isShiyitu = (data: CadData) => data.type.includes("示意图") || data.type2.includes("示意图");

export const LINE_LIMIT = [0.01, 0.7];
export const validColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff"];
export const validateLines = (data: CadData, tolerance = DEFAULT_TOLERANCE): ValidateResult => {
    if (isShiyitu(data) || data.shuangxiangzhewan) {
        return {valid: true, errMsg: [], lines: []};
    }
    const lines = sortLines(data, tolerance);
    const result: ValidateResult = {valid: true, errMsg: [], lines};
    const [min, max] = LINE_LIMIT;
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
    } else if (lines.length > 1) {
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

export const suanliaodanZoomIn = (cad: CadData) => {
    cad.components.data.forEach((v) => {
        if (v.info.skipSuanliaodanZoom) {
            return;
        }
        const lastSuanliaodanZoom = v.info.lastSuanliaodanZoom ?? 1;
        const rect = v.getBoundingRect();
        if (lastSuanliaodanZoom !== v.suanliaodanZoom) {
            v.info.lastSuanliaodanZoom = v.suanliaodanZoom;
            v.transform({scale: v.suanliaodanZoom / lastSuanliaodanZoom, origin: [rect.left, rect.top]}, true);
        }
    });
    cad.updateComponents();
};

export const suanliaodanZoomOut = (cad: CadData) => {
    cad.components.data.forEach((v) => {
        if (v.info.skipSuanliaodanZoom) {
            return;
        }
        const lastSuanliaodanZoom = v.info.lastSuanliaodanZoom ?? 1;
        const rect = v.getBoundingRect();
        if (lastSuanliaodanZoom !== 1) {
            delete v.info.lastSuanliaodanZoom;
            v.transform({scale: 1 / lastSuanliaodanZoom, origin: [rect.left, rect.top]}, true);
        }
    });
    cad.updateComponents();
};
