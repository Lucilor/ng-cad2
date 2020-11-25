import Color from "color";
import {createPdf} from "pdfmake/build/pdfmake";
import {
    CadData,
    CadEntities,
    CadViewer,
    CadViewerConfig,
    CadDimension,
    CadMtext,
    CadOption,
    CadBaseLine,
    CadJointPoint
} from "./cad-viewer";
import {getDPI, Point} from "./utils";

export async function getCadPreview(data: CadData, width = 300, height = 150, padding = [10]) {
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
    (await cad.render()).center();
    const src = cad.toBase64();
    cad.destroy();
    return src;
}

export async function printCads(dataArr: CadData[], config: Partial<CadViewerConfig> = {}) {
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
            if (e.linewidth >= 0.3) {
                e.linewidth *= 3;
            }
            e.color = new Color(0);
            if (e instanceof CadDimension) {
                e.renderStyle = 2;
            }
        }, true);
        const cadPrint = new CadViewer(data, {
            ...config,
            width: width * scaleX,
            height: height * scaleY,
            backgroundColor: "white",
            padding: [18 * scale],
            minLinewidth: 4,
            hideLineLength: true,
            hideLineGongshi: true,
            renderStep: Infinity
        }).appendTo(document.body);
        await cadPrint.render();
        cadPrint.select(cadPrint.data.getAllEntities().dimension);
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
}

export function addCadGongshi(data: CadData, visible: boolean, ignoreTop: boolean) {
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
}

export function removeCadGongshi(data: CadData) {
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
}

export function getCadGongshiText(data: CadData) {
    const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
    let text = `${zhankaikuan} × ${zhankaigao} = ${shuliang}`;
    if (Number(shuliangbeishu) > 1) {
        text += " × " + shuliangbeishu;
    }
    return text;
}

export function setCadData(data: CadData) {
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
}
