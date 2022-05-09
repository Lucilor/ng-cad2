import {Component, OnInit} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgLoading} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData, CadLine, CadViewerConfig, setLinesLength} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {ObjectOf, timeout} from "@utils";
import CSS from "csstype";
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

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private status: AppStatusService,
        private sanitizer: DomSanitizer,
        private spinner: SpinnerService
    ) {}

    ngOnInit() {
        setTimeout(() => this.getOrders(), 0);
    }

    async getOrders() {
        const url = "order/order/dingdanbiaoqian";
        const params = this.route.snapshot.queryParams;
        this.spinner.show(this.spinner.defaultLoaderId, {text: "获取数据..."});
        const response = await this.dataService.post<{code: string; cads: ObjectOf<any>[]}[]>(url, params);
        if (response?.data) {
            this.spinner.show(this.spinner.defaultLoaderId, {text: "生成预览图..."});
            const {cadsRowNum, cadsColNum} = this;
            this.orders = response.data.map((order): Order => {
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
                return {
                    code: order.code,
                    cads,
                    positions: Array.from(Array(cadsRowNum), () => Array(cadsColNum).fill(0)),
                    style: {}
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
            await Promise.all(dataAll.map(async (v) => (v.img = await getImg(v.data, v.imgSize[0], v.imgSize[1]))));
            // await Promise.all(dataAll.map(async (v) => (v.img = "assets/images/empty.jpg")));
            this.spinner.hide(this.spinner.defaultLoaderId);
            await timeout(0);
            await Promise.all(dataAll.map(async (v) => (v.imgLarge = await getImg(v.data, innerWidth * 0.85, innerHeight * 0.85))));
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
}
