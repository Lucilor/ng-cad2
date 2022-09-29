import {Component, OnInit, QueryList, ViewChildren} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgCadEmpty, imgEmpty, imgLoading, session, setGlobal} from "@app/app.common";
import {CadPreviewParams, getCadPreview, getCadXianshigongshi} from "@app/cad.utils";
import {CadData, CadLine, CadViewerConfig, Defaults, setLinesLength} from "@cad-viewer";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf, timeout} from "@utils";
import {Properties} from "csstype";
import JsBarcode from "jsbarcode";
import {cloneDeep} from "lodash";
import {DateTime} from "luxon";

@Component({
    selector: "app-dingdanbiaoqian",
    templateUrl: "./dingdanbiaoqian.component.html",
    styleUrls: ["./dingdanbiaoqian.component.scss"]
})
export class DingdanbiaoqianComponent implements OnInit {
    orders: Order[] = [];
    cadsRowNum = 4;
    cadsColNum = 5;
    pageSize = [1122, 792];
    pagePadding = [17, 17, 5, 17];
    cadSize = [218, 186];
    开启锁向示意图Size = [180, 280] as [number, number];
    sectionConfig: SectionConfig = {
        rows: [
            {
                cells: [
                    {key: "客户名字", label: "客户", class: "alt"},
                    {key: "订单编号", label: "编号", class: "alt"}
                ]
            },
            {
                cells: [{key: "款式"}, {key: "开启锁向", label: "开式"}]
            },
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
    @ViewChildren("barcode") barcodeEls?: QueryList<HTMLDivElement>;

    private _configKey = "订单标签配置";
    private _httpCacheKey = "订单标签请求数据";
    config = {
        showCadSmallImg: true,
        showCadLargeImg: true
    };

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private status: AppStatusService,
        private sanitizer: DomSanitizer,
        private spinner: SpinnerService,
        private message: MessageService
    ) {}

    ngOnInit() {
        setTimeout(() => this.getOrders(), 0);
        this._loadConfig();
        setGlobal("ddbq", this);
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
            const {cadsRowNum, cadsColNum} = this;
            this.orders = ddbqData.map<Order>((order) => {
                const maxLength = 80;
                const cads: Order["cads"] = order.cads.map((cad): Order["cads"][0] => {
                    const img = imgLoading;
                    const imgLarge = imgLoading;
                    const data = new CadData(cad);

                    if (!data.type.includes("企料") && !data.shouldShowIntersection) {
                        const lines: CadLine[] = [];
                        data.entities.line.forEach((e) => {
                            if (e.length > maxLength) {
                                lines.push(e);
                                e.显示线长 = e.length.toString();
                            }
                        });
                        setLinesLength(data, lines, maxLength);
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
                    开启锁向示意图: {data: new CadData(order.开启锁向示意图), img: imgEmpty},
                    cads,
                    positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
                    style: {},
                    info: Array(3).fill(order.流程单数据) || []
                };
            });
            this.splitOrders();
            document.title = `${this.orders[0].code}_${DateTime.now().toFormat("yyyyMMdd")}`;

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
            const getImg = async (data: CadData, config: Partial<CadViewerConfig>, autoSize?: boolean) => {
                const previewParams: CadPreviewParams = {config: {...configBase, ...config}, maxZoom: 2.5, autoSize};
                const imgUrl = await getCadPreview(collection, data, previewParams);
                return this.sanitizer.bypassSecurityTrustUrl(imgUrl);
            };
            const {showCadSmallImg, showCadLargeImg} = this.config;
            const imgLargeSize = [innerWidth * 0.85, innerHeight * 0.85] as [number, number];
            const 开启锁向示意图Size = this.开启锁向示意图Size;
            for (const {cads, 开启锁向示意图, materialResult} of this.orders) {
                if (开启锁向示意图) {
                    开启锁向示意图.data.type = "";
                    开启锁向示意图.data.type2 = "";
                    if (materialResult) {
                        for (const e of 开启锁向示意图.data.entities.dimension) {
                            const 显示公式 = getCadXianshigongshi(e.mingzi);
                            if (显示公式 && 显示公式 in materialResult) {
                                e.mingzi = String(materialResult[显示公式]);
                            }
                        }
                    }
                    开启锁向示意图.img = await getImg(
                        开启锁向示意图.data,
                        {
                            width: 开启锁向示意图Size[0],
                            height: 开启锁向示意图Size[1],
                            hideLineLength: true
                        },
                        true
                    );
                }
                if (showCadSmallImg) {
                    await Promise.all(cads.map(async (v) => (v.img = await getImg(v.data, {width: v.imgSize[0], height: v.imgSize[1]}))));
                } else {
                    await Promise.all(cads.map(async (v) => (v.img = imgCadEmpty)));
                }
                if (showCadLargeImg) {
                    await Promise.all(
                        cads.map(async (v) => (v.imgLarge = await getImg(v.data, {width: imgLargeSize[0], height: imgLargeSize[1]})))
                    );
                } else {
                    await Promise.all(cads.map(async (v) => delete v.imgLarge));
                }
            }
            this.spinner.hide(this.spinner.defaultLoaderId);
        } else {
            this.spinner.hide(this.spinner.defaultLoaderId);
        }
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
        orders.forEach((order) => {
            const cads = order.cads;
            order.cads = [];
            const pushOrder = () => {
                const o = cloneDeep(order);
                this.orders.push(o);
                return o;
            };
            pushOrder();
            order.info = null;
            delete order.开启锁向示意图;
            delete order.materialResult;
            let orderCurr = pushOrder();
            let orderPrev: Order | null = null;
            for (let i = 0; i < cads.length; i++) {
                let result = this.takeEmptyPosition(orderCurr.positions, cads[i].isLarge);
                if (result.position) {
                    this.setCad(cads[i], result.position);
                    orderCurr.cads.push(cads[i]);
                } else {
                    if (orderPrev) {
                        result = this.takeEmptyPosition(orderPrev.positions, cads[i].isLarge);
                        if (result.position) {
                            this.setCad(cads[i], result.position);
                            orderPrev.cads.push(cads[i]);
                        } else if (result.isFull) {
                            orderPrev = null;
                        }
                    } else {
                        orderPrev = orderCurr;
                        orderCurr = pushOrder();
                        i--;
                    }
                }
            }
        });
        this.orders.forEach((order) => this.setPage(order));
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
}

export interface Order {
    code: string;
    开启锁向示意图?: {data: CadData; img: SafeUrl};
    materialResult?: Formulas;
    cads: {
        data: CadData;
        isLarge: boolean;
        img: SafeUrl;
        imgLarge?: SafeUrl;
        imgSize: [number, number];
        calcW: number;
        calcH: number;
        style: Properties;
        imgStyle: Properties;
    }[];
    positions: number[][];
    style: Properties;
    info: ObjectOf<string | number>[] | null;
}

export interface SectionCell {
    key: string;
    label?: string;
    isBoolean?: boolean;
    class?: string | string[];
    style?: Properties;
}

export interface SectionConfig {
    rows: {
        cells: SectionCell[];
    }[];
}

export type DdbqData = {
    code: string;
    materialResult: Formulas;
    cads: ObjectOf<any>[];
    流程单数据: ObjectOf<string>;
    开启锁向示意图: any;
}[];
