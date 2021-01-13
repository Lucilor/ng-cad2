import Color from "color";
import {createPdf} from "pdfmake/build/pdfmake";
import {
    CadData,
    CadEntities,
    CadViewer,
    CadViewerConfig,
    CadMtext,
    CadOption,
    CadBaseLine,
    CadJointPoint,
    CadDimension
} from "./cad-viewer";
import {getDPI, Point} from "./utils";

export const getCadPreview = async (data: CadData, width = 300, height = 150, padding = [10]) => {
    const data2 = new CadData();
    data2.entities = new CadEntities(data.getAllEntities().export());
    data2.entities.dimension = [];
    data2.entities.mtext = [];
    const cad = new CadViewer(new CadData(), {
        width,
        height,
        padding,
        backgroundColor: "black",
        hideLineLength: true,
        hideLineGongshi: true
    });
    cad.appendTo(document.body);
    cad.data = data2;
    cad.render().center();
    const src = cad.toBase64();
    cad.destroy();
    return src;
};

export const printCads = async (dataArr: CadData[], config: Partial<CadViewerConfig> = {}, linewidth?: number) => {
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
    for (const data of dataArr) {
        data.getAllEntities().forEach((e) => {
            e.color = new Color(0);
            if (e instanceof CadDimension) {
                e.renderStyle = 2;
                e.selected = true;
            } else if (e instanceof CadMtext && e.fontFamily === "仿宋") {
                e.fontWeight = "bolder";
            }
        }, true);
        const cadPrint = new CadViewer(data, {
            ...config,
            width: width * scaleX,
            height: height * scaleY,
            backgroundColor: "white",
            padding: [18 * scale],
            hideLineLength: true,
            hideLineGongshi: true,
            minLinewidth: -Infinity
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
        const src = (await cadPrint.toCanvas()).toDataURL();
        cadPrint.destroy();
        imgs.push(src);
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
    const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data.zhankai[0];
    let text = `${zhankaikuan} × ${zhankaigao} = ${shuliang}`;
    if (Number(shuliangbeishu) > 1) {
        text += " × " + shuliangbeishu;
    }
    return text;
};

export const setCadData = (data: CadData) => {
    if (data.options.length < 1) {
        data.options.push(new CadOption());
    }
    if (data.conditions.length < 1) {
        data.conditions.push("");
    }
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
