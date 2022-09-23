import {
    CadData,
    CadLine,
    CadMtext,
    CadImage,
    CadViewer,
    CadEntities,
    CadEntity,
    CadDimension,
    Defaults,
    CadLineLike,
    CadCircle,
    CadViewerConfig,
    CadDimensionStyle,
    CadDimensionLinear
} from "@cad-viewer";
import {environment} from "@src/environments/environment";
import {isNearZero, isBetween, Point, ObjectOf, getDPI, getImageDataUrl, loadImage, Rectangle, Matrix} from "@utils";
import {Properties} from "csstype";
import {intersection} from "lodash";
import {createPdf} from "pdfmake/build/pdfmake";
import {prepareCadViewer} from "./cad.utils";
import {Formulas} from "./utils/calc";

type PdfDocument = Parameters<typeof createPdf>[0];

const findDesignPicsRectLines = (data: CadData, keyword: string, findLocator: boolean) => {
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
        throw new Error("模板没有垂直线");
    }
    if (hLines.length < 1) {
        throw new Error("模板没有水平线");
    }
    vLines.sort((a, b) => a.start.x - b.start.x);
    hLines.sort((a, b) => a.start.y - b.start.y);
    const result = {
        locator: null as CadMtext | null,
        rect,
        lines: {
            top: null as CadLine | null,
            right: null as CadLine | null,
            bottom: null as CadLine | null,
            left: null as CadLine | null
        }
    };

    if (findLocator) {
        const locator = data.entities.mtext.find((e) => e.text === `#${keyword}#`);
        if (!locator) {
            throw new Error(`没有找到${keyword}标识`);
        }
        const {
            left: locatorLeft,
            right: locatorRight,
            top: locatorTop,
            bottom: locatorBottom,
            width: locatorWidth,
            height: locatorHeight
        } = locator.boundingRect;
        result.locator = locator;
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
        result.lines.top = topLines.at(0) || null;
        result.lines.right = rightLines.at(0) || null;
        result.lines.bottom = bottomLines.at(-1) || null;
        result.lines.left = leftLines.at(-1) || null;
        if (!result.lines.top || !result.lines.right || !result.lines.bottom || !result.lines.left) {
            throw new Error(`${keyword}没有足够的线`, {});
        }
        rect.left = result.lines.left.minX;
        rect.right = result.lines.right.maxX;
        rect.top = result.lines.top.minY;
        rect.bottom = result.lines.bottom.maxY;
    } else {
        rect.left = vLines[0].start.x;
        rect.right = vLines[vLines.length - 1].start.x;
        const vLinesMinLength = rect.height / 2;
        const vLines2 = vLines.filter((e) => e.length > vLinesMinLength);
        const vLinesDx = vLines2[vLines2.length - 1].start.x - vLines2[0].start.x;
        const hLines2 = hLines.filter((e) => isNearZero(e.length - vLinesDx, 1)).reverse();
        if (hLines2.length < 1) {
            throw new Error("模板没有合适的线");
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
    }
    return {...result};
};

export interface DrawDesignPicsParams {
    margin?: number;
    anchorImg?: number[];
    anchorBg?: number[];
    objectFit?: Properties["objectFit"];
    flip?: string;
}
const drawDesignPics = async (
    data: CadData,
    num: number,
    findLocator: boolean,
    rect: Rectangle,
    params: DrawDesignPicsParams = {}
): Promise<CadImage[] | null> => {
    const {margin, anchorBg, anchorImg, objectFit, flip}: Required<DrawDesignPicsParams> = {
        margin: 0,
        anchorBg: [0.5, 0.5],
        anchorImg: [0.5, 0.5],
        objectFit: "contain",
        flip: "",
        ...params
    };
    const flip2 = flip?.toLocaleLowerCase() || "";

    const {width, height, top, bottom, left, right} = rect;
    if (!findLocator) {
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

    let imgWidth: number;
    let imgHeight: number;
    let getImgRect: (i: number) => Rectangle;
    if (width > height) {
        imgWidth = width / num - margin * 2;
        imgHeight = height - margin * 2;
        getImgRect = (i) => {
            const imgBottom = bottom + margin;
            const imgTop = top - margin;
            const imgLeft = left + margin + (imgWidth + margin * 2) * i;
            const imgRight = imgLeft + imgWidth;
            return new Rectangle([imgLeft, imgBottom], [imgRight, imgTop]);
        };
    } else {
        imgWidth = width - margin * 2;
        imgHeight = height / num - margin * 2;
        getImgRect = (i) => {
            const imgBottom = bottom + margin + (imgHeight + margin * 2) * i;
            const imgTop = imgBottom + imgHeight;
            const imgLeft = left + margin;
            const imgRight = right - margin;
            return new Rectangle([imgLeft, imgBottom], [imgRight, imgTop]);
        };
    }

    const cadImages: CadImage[] = [];
    for (let i = 0; i < num; i++) {
        const cadImage = new CadImage();
        if (findLocator) {
            cadImage.anchor.set(anchorImg[0], anchorImg[1]);
        } else {
            cadImage.anchor.set(0.5, 0.5);
        }
        cadImage.position = getImgRect(i).getPoint(anchorBg[0], anchorBg[1]);
        cadImage.targetSize = new Point(imgWidth, imgHeight);
        cadImage.objectFit = objectFit;
        const matrix = new Matrix();
        if (flip2.includes("h")) {
            matrix.scale(-1, 1);
        } else if (flip2.includes("v")) {
            matrix.scale(1, -1);
        }
        cadImage.transform(matrix, true);
        data.entities.add(cadImage);
        cadImages.push(cadImage);
    }
    return cadImages;
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
            arr.push(getIndentText(text));
            start = end - 1;
        }
    }
    arr.push(getIndentText(source.slice(start)));
    cad.remove(tmpText);
    return arr;
};

export const configCadDataForPrint = (
    cad: CadViewer,
    data: CadData | CadEntities | CadEntity[] | CadEntity,
    params: PrintCadsParams,
    isZxpj: boolean
) => {
    const linewidth = params.linewidth || 1;
    const dimStyle = params.dimStyle;
    const config = cad.getConfig();
    const textMap = params.textMap || {};
    let es: CadEntities;
    if (data instanceof CadData) {
        es = data.entities;
    } else if (data instanceof CadEntities) {
        es = data;
    } else if (Array.isArray(data)) {
        es = new CadEntities(data);
    } else {
        es = new CadEntities([data]);
    }

    const getConfigBefore = (e: CadEntity) => {
        if (!e.info.configBefore) {
            e.info.configBefore = {};
        }
        return e.info.configBefore;
    };
    const configDimension = (e: CadDimension, colorNumber: number) => {
        e.linewidth = linewidth;
        e.setStyle({
            ...dimStyle,
            dimensionLine: {color: "#505050", dashArray: Defaults.DASH_ARRAY},
            extensionLines: {color: "#505050", length: 12},
            arrows: {color: "#505050"}
        });
        if (colorNumber === 0xff00ff || e.layer === "门扇中间宽标注") {
            e.setStyle({arrows: {hidden: true}});
        }
    };
    const configMText = (e: CadMtext) => {
        const {text, insert} = e;
        const offsetInsert = (x: number, y: number) => {
            const configBefore = getConfigBefore(e);
            const insertOffsetBefore = configBefore.insertOffset;
            if (insertOffsetBefore) {
                insert.x += insertOffsetBefore[0] - x;
                insert.y += insertOffsetBefore[1] - y;
            } else {
                configBefore.insertOffset = [x, y];
                insert.x += x;
                insert.y += y;
            }
        };
        const offsetFontSize = (size: number) => {
            const configBefore = getConfigBefore(e);
            if (typeof configBefore.fontSize === "number") {
                e.fontStyle.size = configBefore.fontSize + size;
            } else if (typeof e.fontStyle.size === "number") {
                configBefore.fontSize = e.fontStyle.size;
                e.fontStyle.size += size;
            }
        };

        if ((isZxpj || e.text.includes("     ")) && !isNaN(Number(e.text))) {
            if (e.fontStyle.size === 24) {
                offsetInsert(3, -7);
            } else if (e.fontStyle.size === 22) {
                offsetInsert(3, -7);
            }
            e.text = text.replace("     ", "");
            e.fontStyle.family = "仿宋";
            e.fontStyle.weight = "bolder";
            offsetFontSize(8);
        } else {
            if (config.fontStyle?.family === "宋体") {
                offsetFontSize(6);
                offsetInsert(0, -5);
            } else {
                offsetInsert(0, -12);
            }
        }
        if ((e.fontStyle.size || -1) < 24) {
            e.fontStyle.weight = "bolder";
        }

        if (text.match(/^花件信息/)) {
            // * 自动换行
            let wrapedText = text.slice(4);
            let lines = es.line;
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
                    .map((v) => getWrapedText(cad, v, e, getWrapedTextOptions(v, dMin)).join("\n"))
                    .join("\n");
            } catch (error) {
                console.warn("花件信息自动换行时出错");
                console.warn(error);
            }
            e.text = wrapedText;
        }

        if (e.text in textMap) {
            e.text = textMap[e.text];
        }
    };
    const configLine = (e: CadLineLike, colorNumber: number) => {
        if (isZxpj || colorNumber === 0x333333 || e.layer === "1") {
            e.linewidth = linewidth;
        }
    };

    for (const e of es.toArray()) {
        const colorNumber = e.getColor().rgbNumber();
        if (e instanceof CadLineLike) {
            configLine(e, colorNumber);
        } else if (e instanceof CadDimension) {
            configDimension(e, colorNumber);
        } else if (e instanceof CadMtext) {
            configMText(e);
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
};

export interface PrintCadsParams {
    cads: CadData[];
    config?: Partial<CadViewerConfig>;
    linewidth?: number;
    dimStyle?: CadDimensionStyle;
    designPics?: ObjectOf<{
        urls: string[][];
        showSmall: boolean;
        showLarge: boolean;
        styles?: DrawDesignPicsParams;
    }>;
    extra?: {拉手信息宽度?: number};
    url?: string;
    keepCad?: boolean;
    codes?: string[];
    type?: string;
    info?: PdfDocument["info"];
    orders?: {materialResult: Formulas}[];
    textMap?: ObjectOf<string>;
    dropDownKeys?: string[];
}
/**
 * A4: (210 × 297)mm²
 *    =(8.26 × 11.69)in² (1in = 25.4mm)
 * 	  =(794 × 1123)px² (96dpi)
 */
export const printCads = async (params: PrintCadsParams) => {
    const cads = params.cads.map((v) => v.clone());
    const config = params.config || {};
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

    const config2: Partial<CadViewerConfig> = {
        backgroundColor: "white",
        padding: [18 * scale],
        hideLineLength: true,
        hideLineGongshi: true,
        minLinewidth: 0,
        ...config
    };
    const cad = new CadViewer(new CadData(), config2);
    cad.appendTo(document.body);
    cad.dom.style.opacity = "0";
    await prepareCadViewer(cad);

    const content: PdfDocument["content"] = [];
    let pageOrientation: PdfDocument["pageOrientation"] = "portrait";
    const imgMap: ObjectOf<string> = {};
    for (let i = 0; i < cads.length; i++) {
        const data = cads[i];
        const rect = data.getBoundingRect();
        let localWidth: number;
        let localHeight: number;
        if (rect.width < rect.height) {
            localWidth = width;
            localHeight = height;
            if (i === 0) {
                pageOrientation = "portrait";
            }
        } else {
            localWidth = height;
            localHeight = width;
            if (i === 0) {
                pageOrientation = "landscape";
            }
        }
        cad.resize(localWidth * scaleX, localHeight * scaleY);
        configCadDataForPrint(cad, data, params, false);
        data.updatePartners().updateComponents();
        cad.data = data;
        await cad.reset().render();
        cad.center();
        const {拉手信息宽度} = extra;
        if (typeof 拉手信息宽度 === "number" && 拉手信息宽度 > 0) {
            const 拉手信息 = data.entities.mtext.filter((v) => v.text.startsWith("拉手:")).sort((v) => v.insert.x - v.insert.y);
            for (const mtext of 拉手信息) {
                const {el, text} = mtext;
                if (el && el.width() >= 拉手信息宽度) {
                    try {
                        mtext.text = getWrapedText(cad, text, mtext, getWrapedTextOptions(text, 拉手信息宽度)).join("\n     ");
                        cad.render(mtext);
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
            for (const keyword in designPics) {
                const {urls, showSmall, showLarge, styles} = designPics[keyword];
                const currUrls = urls[i] || urls[0];
                let result: ReturnType<typeof findDesignPicsRectLines>;
                try {
                    result = findDesignPicsRectLines(data, keyword, showSmall);
                } catch (error) {
                    if (error instanceof Error) {
                        console.warn(error.message);
                    } else {
                        console.warn(error);
                    }
                    continue;
                }
                if (result.locator) {
                    result.locator.visible = false;
                    cad.render(result.locator);
                }
                if (Array.isArray(currUrls) && currUrls.length > 0) {
                    for (const e of Object.values(result.lines)) {
                        if (e) {
                            e.visible = true;
                            cad.render(e);
                        }
                    }
                    const data2 = data.clone();
                    const setImageUrl = async (cadImages: CadImage[]) => {
                        await Promise.all(
                            cadImages.map(async (e, j) => {
                                let url2 = currUrls[j];
                                if (!environment.production && url2.startsWith("https://www.let888.cn")) {
                                    url2 = url2.replace("https://www.let888.cn", origin);
                                }
                                if (url2 in imgMap && imgMap[url2]) {
                                    e.url = imgMap[url2];
                                } else {
                                    try {
                                        e.url = getImageDataUrl(await loadImage(url2));
                                    } catch (error) {
                                        imgMap[url2] = "";
                                    }
                                    imgMap[url2] = e.url;
                                }
                            })
                        );
                    };
                    if (showSmall) {
                        const cadImages = await drawDesignPics(data, currUrls.length, true, result.rect, styles);
                        if (cadImages) {
                            await setImageUrl(cadImages);
                            await cad.render(cadImages);
                            cad.center();
                            img = await cad.toDataURL();
                        }
                    } else {
                        img = await cad.toDataURL();
                    }
                    if (showLarge) {
                        const cadImages = await drawDesignPics(data2, currUrls.length, false, result.rect, styles);
                        if (cadImages) {
                            await setImageUrl(cadImages);
                            cad.data = data2;
                            await cad.render(cadImages);
                            cad.center();
                            img2 = await cad.toDataURL();
                            cad.data = data;
                        }
                    }
                } else {
                    const ids: string[] = [];
                    for (const e of Object.values(result.lines)) {
                        if (e) {
                            ids.push(e.id);
                        }
                    }
                    for (const e of data.entities.dimension) {
                        if (e instanceof CadDimensionLinear) {
                            if (intersection([e.entity1.id, e.entity2.id], ids).length > 0) {
                                e.visible = false;
                                cad.render(e);
                            }
                        }
                    }
                }
            }
        }
        img = await cad.toDataURL();
        content.push({image: img, width: localWidth, height: localHeight});
        if (img2) {
            content.push({image: img2, width: localWidth, height: localHeight});
        }
    }

    if (!params.keepCad) {
        cad.destroy();
    } else {
        setTimeout(() => {
            cad.dom.style.opacity = "";
        }, 0);
    }
    const now = new Date();
    const pdf = createPdf(
        {
            info: {
                title: "打印CAD",
                author: "Lucilor",
                subject: "Lucilor",
                creationDate: now,
                modDate: now,
                keywords: "cad print",
                ...params.info
            },
            content,
            pageSize: "A4",
            pageOrientation,
            pageMargins: 0
        },
        {}
    );
    const url = await new Promise<string>((resolve) => {
        pdf.getBlob((blob) => resolve(URL.createObjectURL(blob)));
    });
    return {url, errors, cad};
};
