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
    getWrapedText
} from "@cad-viewer";
import {timeout, getDPI, Point, isNearZero, loadImage} from "@utils";
import Color from "color";
import {createPdf} from "pdfmake/build/pdfmake";

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

export interface PrintCadsParams {
    cads: CadData[];
    config?: Partial<CadViewerConfig>;
    linewidth?: number;
    renderStyle?: CadDimension["renderStyle"];
    designPics?: {urls: (string | string[])[]; margin: number};
    extra?: {拉手信息宽度?: number};
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
    await prepareCadViewer(cadPrint);

    const imgs: string[] = [];
    for (let i = 0; i < cads.length; i++) {
        const data = cads[i];
        data.getAllEntities().forEach((e) => {
            const colorStr = e.color.string();
            if (colorStr === "rgb(128, 128, 128)") {
                e.opacity = 0;
            }
            e.color = new Color(0);
            if (e instanceof CadLineLike && colorStr === "rgb(51, 51, 51)") {
                e.linewidth = linewidth;
            }
            if (e instanceof CadDimension) {
                e.linewidth = linewidth;
                e.renderStyle = renderStyle;
                e.selected = true;
            } else if (e instanceof CadMtext) {
                if (e.text.includes("     ") && !isNaN(Number(e.text))) {
                    if (e.font_size === 24) {
                        e.font_size = 36;
                        e.insert.y += 11;
                        e.insert.x -= 4;
                    }
                    e.text = e.text.replace("     ", "");
                    e.fontFamily = "仿宋";
                    e.fontWeight = "bolder";
                } else {
                    if (config.fontFamily === "宋体") {
                        e.font_size += 6;
                        e.insert.y -= 5;
                    } else {
                        e.insert.y -= 12;
                    }
                }
                if (e.font_size < 24) {
                    e.fontWeight = "bolder";
                }
            }
        }, true);
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
            cads.forEach((cad) => {
                const 拉手信息 = cad.entities.mtext.filter((v) => v.text.startsWith("拉手:")).sort((v) => v.insert.x - v.insert.y);
                拉手信息.forEach((mtext) => {
                    const {el, text, insert, anchor} = mtext;
                    if (el && el.width() >= 拉手信息宽度) {
                        const {fontStyle} = cadPrint.stylizer.get(mtext);
                        try {
                            mtext.text = getWrapedText(text, 拉手信息宽度, fontStyle, insert, anchor).join("\n     ");
                            cadPrint.render(mtext);
                        } catch (error) {
                            console.warn("拉手信息自动换行出错");
                        }
                    }
                });
            });
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

export const setCadData = (data: CadData) => {
    if (data.baseLines.length < 1) {
        data.baseLines.push(new CadBaseLine());
    }
    if (data.jointPoints.length < 1) {
        data.jointPoints.push(new CadJointPoint());
    }
    data.entities.dimension.forEach((e) => (e.color = new Color(0x00ff00)));
    data.partners.forEach((v) => setCadData(v));
    data.components.data.forEach((v) => setCadData(v));
};
