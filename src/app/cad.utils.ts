import Color from "color";
import {createPdf} from "pdfmake/build/pdfmake";
import {CadData, CadViewer, CadViewerConfig, CadMtext, CadBaseLine, CadJointPoint, CadDimension, CadZhankai} from "./cad-viewer";
import {getDPI, Point, timeout} from "./utils";

export const getCadPreview = async (data: CadData, config: Partial<CadViewerConfig> = {}) => {
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
    cad.data = data.clone();
    cad.render().center();
    // ? ?? ???
    await timeout(0);
    cad.center();
    const src = cad.toBase64();
    cad.destroy();
    return src;
};

/**
 * A4: (210 × 297)mm²
 *    =(8.26 × 11.69)in² (1in = 25.4mm)
 * 	  =(794 × 1123)px² (96dpi)
 */
export const printCads = async (
    dataArr: CadData[],
    config: Partial<CadViewerConfig> = {},
    linewidth = 1,
    renderStyle: CadDimension["renderStyle"] = 2
) => {
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

    const imgs: string[] = [];
    dataArr = dataArr.map((v) => v.clone());
    for (const data of dataArr) {
        data.getAllEntities().forEach((e) => {
            if (e.color.string() === "rgb(128, 128, 128)") {
                e.opacity = 0;
            }
            e.color = new Color(0);
            e.linewidth = linewidth;
            if (e instanceof CadDimension) {
                e.renderStyle = renderStyle;
                e.selected = true;
            } else if (e instanceof CadMtext && e.fontFamily === "仿宋") {
                e.fontWeight = "bolder";
            }
        }, true);
        const cadPrint = new CadViewer(data, {
            width: width * scaleX,
            height: height * scaleY,
            backgroundColor: "white",
            padding: [18 * scale],
            hideLineLength: true,
            hideLineGongshi: true,
            minLinewidth: 0,
            ...config
        }).appendTo(document.body);
        cadPrint.center();
        cadPrint.render();
        data.updatePartners().updateComponents();
        cadPrint.render().center();
        cadPrint.draw.find("[type='DIMENSION']").forEach((el) => {
            el.children().forEach((child) => {
                if (child.node.tagName === "text") {
                    return;
                }
                if (child.hasClass("stroke")) {
                    child.stroke("grey");
                }
                if (child.hasClass("fill")) {
                    child.fill("grey");
                }
            });
        });
        imgs.push((await cadPrint.toCanvas()).toDataURL());
        document.body.appendChild(await cadPrint.toCanvas());
        cadPrint.destroy();
    }
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
