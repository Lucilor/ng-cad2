import {Component, OnInit, QueryList, ViewChildren} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgLoading, session} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData, CadLine, CadViewerConfig, setLinesLength} from "@cad-viewer";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {ObjectOf, timeout} from "@utils";
import CSS from "csstype";
import JsBarcode from "jsbarcode";
import {cloneDeep} from "lodash";

export interface Order {
    code: string;
    cads: {
        data: CadData;
        isLarge: boolean;
        img: SafeUrl;
        imgLarge?: SafeUrl;
        imgSize: [number, number];
        calcW: number;
        calcH: number;
        style: CSS.Properties;
        imgStyle: CSS.Properties;
    }[];
    positions: number[][];
    style: CSS.Properties;
    info: ObjectOf<string | number>[] | null;
}

export interface SectionConfig {
    rows: {
        cells: {key: string; label?: string; isBoolean?: boolean}[];
    }[];
}

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
    fixedLengthTextSize = 20;
    sectionConfig: SectionConfig = {
        rows: [
            {
                cells: [
                    {key: "经销商名字", label: "客户"},
                    {key: "订单编号", label: "编号"}
                ]
            },
            {
                cells: [{key: "款式"}, {key: "开式"}]
            },
            {cells: [{key: "锁型", label: "锁型"}]},
            {cells: [{key: "底框"}, {key: "铰型"}, {key: "商标"}]},
            {
                cells: [
                    {key: "猫眼", isBoolean: true},
                    {key: "安装孔", isBoolean: true},
                    {key: "拉片", isBoolean: true}
                ]
            },
            {cells: [{key: "内门类型"}]},
            {
                cells: [
                    {key: "内门锁型", label: "锁型"},
                    {key: "内门猫眼", label: "猫眼"},
                    {key: "内门页厚", label: "页厚"}
                ]
            }
        ]
    };
    production = environment.production;
    @ViewChildren("barcode") barcodeEls?: QueryList<HTMLDivElement>;

    private _configKey = "订单标签配置";
    config = {
        showCadSmallImg: true,
        showCadLargeImg: true
    };

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private status: AppStatusService,
        private sanitizer: DomSanitizer,
        private spinner: SpinnerService
    ) {}

    ngOnInit() {
        setTimeout(() => this.getOrders(), 0);
        this._loadConfig();
    }

    private _saveConfig() {
        console.log(this.config);
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
        this.spinner.show(this.spinner.defaultLoaderId, {text: "获取数据..."});
        const response = await this.dataService.post<{code: string; cads: ObjectOf<any>[]; 流程单数据: ObjectOf<string>}[]>(url, params);
        if (response?.data) {
            this.spinner.show(this.spinner.defaultLoaderId, {text: "生成预览图..."});
            const {cadsRowNum, cadsColNum} = this;
            this.orders = response.data.map((order): Order => {
                const maxLength = 80;
                const cads: Order["cads"] = order.cads.map((cad): Order["cads"][0] => {
                    const img = imgLoading;
                    const imgLarge = imgLoading;
                    const data = new CadData(cad);

                    data.entities.dimension = data.entities.dimension.filter((e) => {
                        if (e.mingzi.match(/(铰|锁|顶)包边正面宽|活动标注|显示公式/)) {
                            e.qujian = "";
                            return true;
                        } else {
                            return false;
                        }
                    });
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
                    cads,
                    positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
                    style: {},
                    info: Array(3).fill(order.流程单数据) || []
                };
            });
            this.splitOrders();
            await timeout(0);

            const {fixedLengthTextSize} = this;
            const configBase: Partial<CadViewerConfig> = {
                hideLineLength: false,
                hideLineGongshi: true,
                backgroundColor: "white",
                fontFamily: "宋体"
            };
            const collection = this.status.collection$.value;
            const getImg = async (data: CadData, width: number, height: number) => {
                const config: Partial<CadViewerConfig> = {...configBase, width, height};
                const imgUrl = await getCadPreview(collection, data, this.dataService, {fixedLengthTextSize, config, disableCache: true});
                return this.sanitizer.bypassSecurityTrustUrl(imgUrl);
            };
            const dataAll = this.orders.map((v) => v.cads).flat();
            const {showCadSmallImg, showCadLargeImg} = this.config;
            if (showCadSmallImg) {
                await Promise.all(dataAll.map(async (v) => (v.img = await getImg(v.data, v.imgSize[0], v.imgSize[1]))));
            } else {
                await Promise.all(dataAll.map(async (v) => (v.img = "assets/images/empty.jpg")));
            }
            this.spinner.hide(this.spinner.defaultLoaderId);
            await timeout(0);
            if (showCadLargeImg) {
                await Promise.all(dataAll.map(async (v) => (v.imgLarge = await getImg(v.data, innerWidth * 0.85, innerHeight * 0.85))));
            } else {
                await Promise.all(dataAll.map(async (v) => delete v.imgLarge));
            }
        } else {
            this.spinner.hide(this.spinner.defaultLoaderId);
        }
        JsBarcode(".barcode").init({displayValue: false, margin: 1000});
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
}
