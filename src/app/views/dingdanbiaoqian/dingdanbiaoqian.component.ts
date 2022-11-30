import {Component, OnInit, QueryList, ViewChildren} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {DomSanitizer} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgCadEmpty, imgEmpty, imgLoading, session, setGlobal} from "@app/app.common";
import {
    CadPreviewParams,
    getCadPreview,
    getShuangxiangLineRects,
    setDimensionText,
    setShuangxiangLineRects,
    shouldShowIntersection,
    splitShuangxiangCad
} from "@app/cad.utils";
import {CadData, CadLine, CadViewer, CadViewerConfig, Defaults, generateLineTexts, setLinesLength} from "@cad-viewer";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {
    calcZxpj,
    getMokuaiTitle,
    getStep1Data,
    getZixuanpeijianCads,
    ZixuanpeijianCadItem,
    ZixuanpeijianMokuaiItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {configCadDataForPrint} from "@src/app/cad.print";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf, timeout} from "@utils";
import JsBarcode from "jsbarcode";
import {cloneDeep} from "lodash";
import {DateTime} from "luxon";
import {DdbqData, Order, SectionCell, SectionConfig, ZhijianForm} from "./dingdanbiaoqian.types";

@Component({
    selector: "app-dingdanbiaoqian",
    templateUrl: "./dingdanbiaoqian.component.html",
    styleUrls: ["./dingdanbiaoqian.component.scss"]
})
export class DingdanbiaoqianComponent implements OnInit {
    orders: Order[] = [];
    cadsRowNum = 4;
    cadsColNum = 5;
    pageSize = [1122, 792] as const;
    pagePadding = [17, 17, 5, 17] as const;
    cadSize = [218, 186] as const;
    开启锁向示意图Size = [207, 280] as const;
    配合框Size = [150, 90] as const;
    sectionConfig: SectionConfig = {
        rows: [
            {
                cells: [
                    {key: "客户名字", label: "客户", class: "alt"},
                    {key: "订单编号", label: "编号", class: "alt"}
                ]
            },
            {cells: [{key: "发货方式", label: "发货方式"}]},
            {cells: [{key: "款式"}, {key: "开启锁向", label: "开式"}]},
            {cells: [{key: "拉手信息", label: "锁型", class: "text-left"}]},
            {cells: [{key: "底框"}, {key: "门铰信息", label: "铰型"}, {key: "商标"}]},
            {
                cells: [
                    {key: "猫眼", isBoolean: true},
                    {key: "安装孔", isBoolean: true},
                    {key: "拉片", isBoolean: true}
                ]
            },
            {cells: [{key: "套门信息", label: "内门类型"}]},
            {
                cells: [
                    {key: "套门拉手信息", label: "锁型"},
                    {key: "套门猫眼", label: "猫眼"},
                    {key: "套门厚度", label: "页厚"}
                ]
            }
        ]
    };
    production = environment.production;
    materialResult: Formulas = {};
    type: "流程单" | "标签贴纸" | "质检标签" | "配件模块" | null = null;
    zhijianForms: ZhijianForm[] = [];
    mokuais: ZixuanpeijianMokuaiItem[] = [];
    @ViewChildren("barcode") barcodeEls?: QueryList<HTMLDivElement>;

    private _configKey = "订单标签配置";
    private _httpCacheKey = "订单标签请求数据";
    config = {
        showCadSmallImg: true,
        showCadLargeImg: false
    };

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private status: AppStatusService,
        private sanitizer: DomSanitizer,
        private spinner: SpinnerService,
        private message: MessageService,
        private calc: CalcService,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        setTimeout(() => this.getOrders(), 0);
        this._loadConfig();
        setGlobal("ddbq", this);
        const {type} = this.route.snapshot.queryParams;
        if (type) {
            this.type = type;
        }
    }

    private _saveConfig() {
        session.save<DingdanbiaoqianComponent["config"]>(this._configKey, this.config);
    }

    private _loadConfig() {
        const config = session.load<DingdanbiaoqianComponent["config"]>(this._configKey);
        if (config) {
            this.config = config;
        }
    }

    async getOrders() {
        const url = "order/order/dingdanbiaoqian";
        const params = this.route.snapshot.queryParams;
        const type = this.type;
        if (type === "配件模块") {
            await this.updateMokuais();
            return;
        }
        let ddbqData = session.load<DdbqData>(this._httpCacheKey);
        if (!ddbqData) {
            this.spinner.show(this.spinner.defaultLoaderId, {text: "获取数据..."});
            const response = await this.dataService.post<DdbqData>(url, params);
            ddbqData = response?.data || null;
            if (ddbqData) {
                session.save(this._httpCacheKey, ddbqData);
            }
        }
        if (ddbqData) {
            const {cadsRowNum, cadsColNum, 开启锁向示意图Size, 配合框Size} = this;
            this.orders = ddbqData.map<Order>((order) => {
                const maxLength = 80;
                const cads: Order["cads"] = order.cads.map((cad): Order["cads"][0] => {
                    const img = imgLoading;
                    const imgLarge = imgLoading;
                    const data = new CadData(cad);

                    if (!data.type.includes("企料") && !shouldShowIntersection(data)) {
                        const lines: CadLine[] = [];
                        data.entities.line.forEach((e) => {
                            if (e.length > maxLength) {
                                lines.push(e);
                                e.显示线长 = e.length.toString();
                            }
                        });
                        const shuangxiangCads = splitShuangxiangCad(data);
                        const shuangxiangRects = getShuangxiangLineRects(shuangxiangCads);
                        setLinesLength(data, lines, maxLength);
                        setShuangxiangLineRects(shuangxiangCads, shuangxiangRects);
                    }

                    const isLarge = !!data.info.isLarge;
                    return {
                        data,
                        img,
                        imgLarge,
                        imgSize: isLarge ? [218, 240] : [218, 96],
                        isLarge,
                        calcW: cad.calcW,
                        calcH: cad.calcH,
                        style: {},
                        imgStyle: {}
                    };
                });
                this.sectionConfig.rows.forEach((row) => {
                    row.cells.forEach(({key, isBoolean}) => {
                        if (isBoolean) {
                            order.流程单数据[key] = order.流程单数据[key] ? "✔" : "✖";
                        }
                    });
                });
                return {
                    code: order.code,
                    materialResult: order.materialResult,
                    开启锁向示意图: {
                        data: new CadData(order.开启锁向示意图),
                        img: imgEmpty,
                        style: {width: 开启锁向示意图Size[0] + "px", height: 开启锁向示意图Size[1] + "px"}
                    },
                    配合框: order.配合框.map((v) => ({
                        data: new CadData(v),
                        img: imgEmpty,
                        style: {width: 配合框Size[0] + "px", height: 配合框Size[1] + "px"}
                    })),
                    cads,
                    positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
                    style: {},
                    info: Array(3).fill(order.流程单数据) || [],
                    质检标签: order.质检标签
                };
            });
            document.title = `${this.orders[0].code}_${DateTime.now().toFormat("yyyyMMdd")}`;
            this.splitOrders();

            await timeout(0);
            try {
                JsBarcode(".barcode").init({displayValue: false, margin: 1000});
            } catch (error) {
                let msg = "未知错误";
                if (typeof error === "string") {
                    if (error.includes("is not a valid input")) {
                        msg = "订单编号不能包含中文或特殊字符，请修改订单编号";
                    } else {
                        msg = error;
                    }
                }
                console.warn(error);
                this.spinner.hide(this.spinner.defaultLoaderId);
                this.message.alert("生成条形码出错：" + msg);
                if (this.production) {
                    this.orders = [];
                    return;
                }
            }

            await this.updateImgs(false);
        } else {
            this.spinner.hide(this.spinner.defaultLoaderId);
        }
    }

    async updateImgs(configForPrint: boolean) {
        const {开启锁向示意图Size, 配合框Size} = this;
        this.spinner.show(this.spinner.defaultLoaderId, {text: "生成中..."});
        const configBase: Partial<CadViewerConfig> = {
            hideLineLength: false,
            hideLineGongshi: true,
            backgroundColor: "white",
            fontStyle: {family: "宋体"},
            dimStyle: {
                dimensionLine: {color: "#505050", dashArray: Defaults.DASH_ARRAY},
                extensionLines: {color: "#505050", length: 12},
                arrows: {color: "#505050"},
                text: {size: 36}
            }
        };
        const collection = this.status.collection$.value;
        let tmpCadViewer: CadViewer | undefined;
        const getImg = async (data: CadData, previewParams: Partial<CadPreviewParams>) => {
            const previewParams2: CadPreviewParams = {maxZoom: 1.3, ...previewParams, config: {...configBase, ...previewParams.config}};
            if (configForPrint) {
                if (!tmpCadViewer) {
                    tmpCadViewer = new CadViewer().appendTo(document.body);
                    tmpCadViewer.setConfig(previewParams2.config || {});
                }
                await configCadDataForPrint(tmpCadViewer, data, {cads: []}, {isZxpj: true});
            }
            const imgUrl = await getCadPreview(collection, data, previewParams2);
            return this.sanitizer.bypassSecurityTrustUrl(imgUrl);
        };
        const {showCadSmallImg, showCadLargeImg} = this.config;
        const imgLargeSize = [innerWidth * 0.85, innerHeight * 0.85] as [number, number];
        const setData = (data: CadData, materialResult: Formulas = {}) => {
            for (const e of data.entities.dimension) {
                setDimensionText(e, materialResult);
                e.setStyle({text: {color: "black"}});
            }
            for (const e of data.entities.mtext) {
                const match = e.text.match(/^#(.*)#$/);
                if (match && match[1] && match[1] in materialResult) {
                    e.text = String(materialResult[match[1]]);
                }
            }
        };
        for (const {cads, 开启锁向示意图, 配合框, materialResult} of this.orders) {
            if (开启锁向示意图) {
                开启锁向示意图.data.type = "";
                开启锁向示意图.data.type2 = "";
                setData(开启锁向示意图.data, materialResult);
                for (const e of 开启锁向示意图.data.entities.line) {
                    e.linewidth = 5;
                }
                const previewParams: Partial<CadPreviewParams> = {
                    config: {width: 开启锁向示意图Size[0], height: 开启锁向示意图Size[1], hideLineLength: true},
                    autoSize: true,
                    fixedDimTextSize: 100,
                    fixedMtextSize: 100
                };
                开启锁向示意图.img = await getImg(开启锁向示意图.data, previewParams);
            }
            if (配合框) {
                for (const v of 配合框) {
                    for (const e of v.data.entities.line) {
                        if (e.mingzi !== "背框线") {
                            e.hideLength = true;
                        }
                    }
                    if (v.data.name === "顶框") {
                        v.data.transform({rotate: -Math.PI / 2}, true);
                        generateLineTexts(v.data);
                    }
                    v.img = await getImg(v.data, {
                        config: {width: 配合框Size[0], height: 配合框Size[1], hideLineLength: false},
                        autoSize: true
                    });
                }
            }
            for (const cad of cads) {
                setData(cad.data, materialResult);
            }
            if (showCadSmallImg) {
                await Promise.all(
                    cads.map(async (v) => (v.img = await getImg(v.data, {config: {width: v.imgSize[0], height: v.imgSize[1]}})))
                );
            } else {
                await Promise.all(cads.map(async (v) => (v.img = imgCadEmpty)));
            }
            if (showCadLargeImg) {
                await Promise.all(
                    cads.map(async (v) => (v.imgLarge = await getImg(v.data, {config: {width: imgLargeSize[0], height: imgLargeSize[1]}})))
                );
            } else {
                await Promise.all(cads.map(async (v) => delete v.imgLarge));
            }
        }
        this.spinner.hide(this.spinner.defaultLoaderId);
        tmpCadViewer?.destroy();
    }

    takeEmptyPosition(positions: Order["positions"], isLarge: boolean) {
        const result = {position: null as number[] | null, isFull: false};
        let i = 0;
        let j = 0;
        for (; i < positions.length; i++) {
            j = 0;
            for (; j < positions[i].length; j++) {
                if (isLarge) {
                    if (i % 2 !== 0) {
                        continue;
                    }
                    if (i + 1 >= positions.length || positions[i + 1][j]) {
                        continue;
                    }
                }
                if (!positions[i][j]) {
                    result.position = [i, j];
                    if (isLarge) {
                        positions[i][j] = 2;
                        positions[i + 1][j] = 2;
                    } else {
                        positions[i][j] = 1;
                    }
                    return result;
                }
            }
        }
        result.isFull = i === positions.length && j === positions[i - 1].length;
        return result;
    }

    splitOrders() {
        const orders = this.orders.slice();
        this.orders = [];
        const type = this.type;
        this.zhijianForms = [];
        orders.forEach((order) => {
            const cads = order.cads;
            order.cads = [];
            const pushOrder = () => {
                const o = cloneDeep(order);
                this.orders.push(o);
                return o;
            };
            if (type === "流程单") {
                pushOrder();
            } else if (type === "标签贴纸" || type === "配件模块") {
                order.info = null;
                delete order.开启锁向示意图;
                delete order.配合框;
                delete order.materialResult;
                let orderCurr: Order | null = null;
                let orderPrev: Order | null = null;
                const group1: Order["cads"][0][] = [];
                const group2: Order["cads"][0][] = [];
                for (const cad of cads) {
                    if (cad.data.name.match(/^[左右顶]双包边$/)) {
                        group2.push(cad);
                    } else {
                        group1.push(cad);
                    }
                }
                const groups = [group1, group2];
                for (const group of groups) {
                    if (group.length < 1) {
                        continue;
                    }
                    orderPrev = orderCurr;
                    orderCurr = pushOrder();
                    for (let j = 0; j < group.length; j++) {
                        let result = this.takeEmptyPosition(orderCurr.positions, group[j].isLarge);
                        if (result.position) {
                            this.setCad(group[j], result.position);
                            orderCurr.cads.push(group[j]);
                        } else {
                            if (orderPrev) {
                                result = this.takeEmptyPosition(orderPrev.positions, group[j].isLarge);
                                if (result.position) {
                                    this.setCad(group[j], result.position);
                                    orderPrev.cads.push(group[j]);
                                } else if (result.isFull) {
                                    orderPrev = null;
                                }
                            } else {
                                orderPrev = orderCurr;
                                orderCurr = pushOrder();
                                j--;
                            }
                        }
                    }
                }
            } else if (type === "质检标签" && order.质检标签) {
                this.zhijianForms.push(order.质检标签);
            }
        });
        this.orders.forEach((order) => this.setPage(order));
    }

    async updateMokuais() {
        const {cadsRowNum, cadsColNum, cadSize} = this;
        const params = this.route.snapshot.queryParams;
        const mokuaiIds = ((params.ids as string) || "").split(",").filter(Boolean);
        if (mokuaiIds.length <= 0) {
            return;
        }
        const step1Data = await getStep1Data(this.dataService, {mokuaiIds});
        if (!step1Data) {
            return;
        }
        const typesInfo = step1Data.typesInfo;
        const typesInfo2: ObjectOf<ObjectOf<1>> = {};
        for (const type1 in typesInfo) {
            typesInfo2[type1] = {};
            for (const type2 in typesInfo[type1]) {
                typesInfo2[type1][type2] = 1;
            }
        }
        const cads = (await getZixuanpeijianCads(this.dataService, typesInfo2))?.cads;
        if (!cads) {
            return;
        }
        const mokuais: ZixuanpeijianMokuaiItem[] = [];
        for (const type1 in typesInfo) {
            for (const type2 in typesInfo[type1]) {
                const item: ZixuanpeijianMokuaiItem = {
                    ...typesInfo[type1][type2],
                    type1,
                    type2,
                    totalWidth: "",
                    totalHeight: "",
                    shuruzongkuan: false,
                    shuruzonggao: false,
                    cads: cads[type1][type2].map<ZixuanpeijianCadItem>((data) => ({
                        data,
                        info: {houtaiId: "", zhankai: [], calcZhankai: []}
                    })),
                    calcVars: {keys: ["总宽", "总高"]}
                };
                mokuais.push(item);
            }
        }
        this.mokuais = mokuais;
        calcZxpj(this.message, this.calc, {}, mokuais, [], 1);
        this.orders = mokuais.map((mokuai, i) => {
            const order: Order = {
                code: getMokuaiTitle(mokuai),
                cads: mokuai.cads.map((v) => {
                    v.data.info.标签信息 = ["第一行", "第二行"];
                    return {
                        data: v.data,
                        img: "",
                        imgSize: [...cadSize],
                        isLarge: false,
                        calcW: 100,
                        calcH: 100,
                        style: {},
                        imgStyle: {}
                    };
                }),
                positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
                style: {},
                info: null,
                mokuaiIndex: i
            };
            return order;
        });
        await this.updateImgs(true);
        this.splitOrders();
    }

    print() {
        window.print();
    }

    setCad(cad: Order["cads"][0], position: number[]) {
        const {cadSize, pagePadding} = this;
        const {isLarge} = cad;
        const top = position[0] * cadSize[1] + pagePadding[0] + position[0] * -1;
        const left = position[1] * cadSize[0] + pagePadding[3] + position[1] * -1;
        cad.style = {
            width: `${cadSize[0]}px`,
            height: `${isLarge ? cadSize[1] * 2 - 1 : cadSize[1]}px`,
            top: `${top}px`,
            left: `${left}px`
        };
        cad.imgStyle = {
            height: `${isLarge ? 240 : 96}px`
        };
    }

    setPage(order: Order) {
        const {pagePadding, pageSize} = this;
        order.style = {
            padding: pagePadding.join("px ") + "px",
            width: `${pageSize[0]}px`,
            height: `${pageSize[1]}px`
        };
    }

    onConfigChange() {
        this._saveConfig();
    }

    getValue(section: ObjectOf<string | number>, cell: SectionCell) {
        const value = String(section[cell.key] || "");
        if ((cell.key || cell.label) === "页厚" && value === "0") {
            return "";
        }
        return value;
    }

    clearHttpCache() {
        session.remove(this._httpCacheKey);
    }

    async editMokuaiFormulas(mokuaiIndex = -1) {
        const mokuai = this.mokuais[mokuaiIndex];
        if (!mokuai) {
            return;
        }
        const result = await openEditFormulasDialog(this.dialog, {data: {formulas: mokuai.ceshishuju}});
        if (result) {
            this.spinner.show(this.spinner.defaultLoaderId);
            const gongshiData = Object.entries(result).map(([k, v]) => [k, v]);
            const response = await this.dataService.post("peijian/Houtaisuanliao/edit_gongshi", {
                xiaodaohang: "配件模块",
                xiang: "ceshishuju",
                id: mokuai.id,
                gongshiData
            });
            if (response?.code === 0) {
                await this.updateMokuais();
            }
            this.spinner.hide(this.spinner.defaultLoaderId);
        }
    }
}
