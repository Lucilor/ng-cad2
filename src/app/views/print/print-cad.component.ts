import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {session, setGlobal, timer} from "@app/app.common";
import {getShuangxiangLineRects, maxLineLength, setShuangxiangLineRects, showIntersections, splitShuangxiangCad} from "@app/cad.utils";
import {CadData, CadLine, CadLineLike, CadMtext, CadViewer, CadZhankai, setLinesLength} from "@cad-viewer";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianOutput, ZixuanpeijianInfo, ZixuanpeijianCadItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {PrintCadsParams, printCads, configCadDataForPrint} from "@src/app/cad.print";
import {toFixed} from "@src/app/utils/calc";
import {nameEquals, getCalcZhankaiText} from "@src/app/utils/zhankai";
import {downloadByUrl, ObjectOf, timeout} from "@utils";
import {
    slideInDownOnEnterAnimation,
    slideInRightOnEnterAnimation,
    slideOutRightOnLeaveAnimation,
    slideOutUpOnLeaveAnimation
} from "angular-animations";
import imageCompression from "browser-image-compression";
import {intersection} from "lodash";
import printJS from "print-js";

const duration = 400;
@Component({
    selector: "app-print-cad",
    templateUrl: "./print-cad.component.html",
    styleUrls: ["./print-cad.component.scss"],
    animations: [
        slideInDownOnEnterAnimation({anchor: "toolbarEnter", duration}),
        slideOutUpOnLeaveAnimation({anchor: "toolbarLeave", duration}),
        slideInRightOnEnterAnimation({anchor: "toolbarToggleEnter", duration}),
        slideOutRightOnLeaveAnimation({anchor: "toolbarToggleLeave", duration})
    ]
})
export class PrintCadComponent implements AfterViewInit, OnDestroy {
    loaderId = "printLoader";
    pdfUrlRaw?: string;
    pdfUrl?: SafeUrl;
    showDxfInput = false;
    private _paramKey = "printCad-paramCache";
    private _httpCacheKey = "printCad-httpCache";
    fonts = ["微软雅黑", "宋体", "锐字工房云字库魏体GBK", "等距更纱黑体 SC"];
    toolbarVisible = true;
    downloadUrl: string | null = null;
    mode: "edit" | "print" = "print";
    printParams: Required<PrintCadsParams> = {
        cads: [],
        codes: [],
        type: "",
        config: {fontStyle: {family: this.fonts[0]}},
        linewidth: 2,
        dimStyle: {},
        designPics: {
            设计图: {
                urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
                showSmall: true,
                showLarge: false,
                styles: {
                    margin: 10,
                    anchorBg: [1, 0.5],
                    anchorImg: [1, 0.5]
                }
            },
            花件图: {
                urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
                showSmall: true,
                showLarge: false,
                styles: {
                    margin: 10,
                    anchorBg: [0.5, 0.5],
                    anchorImg: [0.5, 0.5]
                }
            }
        },
        extra: {
            拉手信息宽度: 578
        },
        url: "",
        keepCad: true,
        info: {},
        orders: [],
        textMap: {},
        dropDownKeys: []
    };
    cad: CadViewer | null = null;
    zixuanpeijian: ZixuanpeijianOutput = {模块: [], 零散: []};
    comments: CadMtext[] = [];
    enableZixuanpeijian = false;
    production = environment.production;
    checkEmpty = this.production ? true : false;
    get fontFamily() {
        return this.printParams.config.fontStyle?.family || "";
    }
    set fontFamily(value) {
        if (!this.printParams.config.fontStyle) {
            this.printParams.config.fontStyle = {};
        }
        this.printParams.config.fontStyle.family = value;
    }
    orderImageUrl = "";
    shuchubianliangKeys: string[] = [];
    @ViewChild("cadContainer", {read: ElementRef}) cadContainer?: ElementRef<HTMLDivElement>;

    get materialResult() {
        return this.printParams.orders[0]?.materialResult || {};
        // const materialResult = {...this.printParams.orders[0]?.materialResult};
        // // if (!environment.production) {
        // //     Object.assign(materialResult, materialResultTest);
        // // }
        // return materialResult;
    }

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private sanitizer: DomSanitizer,
        private message: MessageService,
        private spinner: SpinnerService,
        private dialog: MatDialog,
        private status: AppStatusService
    ) {}

    private _onKeyDown = ((event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === "p") {
            event.preventDefault();
            this.print();
        }
    }).bind(this);

    async ngAfterViewInit() {
        await timeout(0);
        setGlobal("print", this);
        const queryParams = {...this.route.snapshot.queryParams};
        const action = queryParams.action as string;
        delete queryParams.action;
        if (!action) {
            this.showDxfInput = true;
            this.enableZixuanpeijian = true;
            this._loadPrintParams();
            if (this.printParams.cads.length > 0) {
                await this.generateSuanliaodan();
            }
            return;
        }
        this.spinner.show(this.loaderId, {text: "正在获取数据..."});
        try {
            let responseData = session.load<PrintCadsParams>(this._httpCacheKey);
            if (!responseData) {
                const response = await this.dataService.post<PrintCadsParams>(action, queryParams, {encrypt: "both"});
                responseData = response?.data || null;
                if (!this.production) {
                    session.save(this._httpCacheKey, responseData);
                }
            }
            if (responseData) {
                responseData.cads = responseData.cads.map((v) => new CadData(v));
                this.downloadUrl = responseData.url || null;
                this.printParams = {...this.printParams, ...responseData};
                this.printParams.info.title = "算料单 " + this.printParams.codes.join("、");
                document.title = this.printParams.info.title;
                const {codes, type} = this.printParams;
                if (codes.length === 1) {
                    const response2 = await this.dataService.post<
                        ZixuanpeijianOutput & {备注: CadMtext[]; 文本映射: ObjectOf<string>; 输出变量: ObjectOf<string>}
                    >("ngcad/getOrderZixuanpeijian", {
                        code: codes[0],
                        type
                    });
                    if (response2?.data) {
                        const {模块, 零散, 备注, 文本映射, 输出变量} = response2.data;
                        for (const item of 模块) {
                            for (const cad of item.cads) {
                                cad.data = new CadData(cad.data);
                                if (cad.displayedData) {
                                    cad.displayedData = new CadData(cad.displayedData);
                                }
                            }
                        }
                        for (const item of 零散) {
                            item.data = new CadData(item.data);
                            if (item.displayedData) {
                                item.displayedData = new CadData(item.displayedData);
                            }
                        }
                        this.zixuanpeijian = {模块, 零散};
                        this.comments = 备注.map((v) => new CadMtext(v));
                        this.printParams.textMap = Array.isArray(文本映射) ? {} : 文本映射;
                        Object.assign(this.materialResult, Array.isArray(输出变量) ? {} : 输出变量);
                    } else {
                        this.zixuanpeijian = {模块: [], 零散: []};
                    }
                    this.enableZixuanpeijian = true;
                } else {
                    this.enableZixuanpeijian = false;
                }
                await this.setZixuanpeijian();
                await this.generateSuanliaodan();
            }
        } catch (error) {
            console.error(error);
            this.message.alert("打印算料单出错");
        } finally {
            this.spinner.hide(this.loaderId);
        }
        window.addEventListener("keydown", this._onKeyDown);
        await this.getOrderImage();
    }

    ngOnDestroy() {
        window.removeEventListener("keydown", this._onKeyDown);
        this.cad?.destroy();
    }

    private _loadPrintParams() {
        const params = session.load<Required<PrintCadsParams>>(this._paramKey);
        if (params) {
            this.printParams.cads = params.cads.map((v) => new CadData(v));
        }
    }

    private _savePrintParams() {
        const cads = this.printParams.cads.map((v) => v.export());
        session.save(this._paramKey, {...this.printParams, cads});
    }

    private _translateCadData(displayedData: CadData | null, info: ZixuanpeijianInfo, dx: number, dy: number) {
        displayedData?.transform({translate: [dx, dy]}, true);
        const translate = info.translate;
        if (translate) {
            translate[0] += dx;
            translate[1] += dy;
        } else {
            info.translate = [dx, dy];
        }
    }

    async print() {
        printJS({printable: this.pdfUrlRaw, type: "pdf"});
    }

    async generateSuanliaodan() {
        const params = this.printParams;
        timer.start(this.loaderId);
        this.spinner.show(this.loaderId, {text: "正在生成算料单..."});
        const cads = params.cads.map((v) => this.splitCads(v)).flat();
        // cads.forEach((v) => {
        //     v.entities.forEach((e) => (e.selectable = false));
        // });
        if (this.enableZixuanpeijian) {
            params.keepCad = true;
        } else {
            params.keepCad = false;
        }
        const {url, errors, cad} = await printCads({...params, cads});
        if (this.enableZixuanpeijian) {
            this.cad = cad;
            if (this.mode === "edit") {
                this.initCad();
            } else {
                this.uninitCad();
            }
        }
        this.spinner.hide(this.loaderId);
        if (errors.length > 0) {
            console.warn(errors);
        }
        this.pdfUrlRaw = url;
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        timer.end(this.loaderId, "生成算料单");
    }

    async uploadDxf(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.item(0);
        input.value = "";
        if (!file) {
            return;
        }
        let data: CadData | null = null;
        if (file.name.endsWith(".dxf")) {
            this.spinner.show(this.loaderId, {text: "正在上传文件..."});
            data = await this.dataService.uploadDxf(file);
        } else {
            data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsText(file);
                reader.onload = () => {
                    resolve(new CadData(JSON.parse(reader.result as string)));
                };
            });
        }
        if (!data) {
            return;
        }
        this.printParams.cads = [data];
        await this.generateSuanliaodan();
        this.spinner.hide(this.loaderId);
        this._savePrintParams();
    }

    toggleToolbarVisible() {
        this.toolbarVisible = !this.toolbarVisible;
    }

    downloadDxf() {
        if (this.cad) {
            this.dataService.downloadDxf(this.cad.data);
        } else if (this.downloadUrl !== null) {
            downloadByUrl(this.downloadUrl);
        } else {
            this.message.alert("没有提供下载地址");
        }
    }

    splitCads(source: CadData) {
        const {top, bottom} = source.getBoundingRect();
        const yValues = [bottom - 500, top + 500];
        const layerName = "分页线";
        source.entities.line.forEach((e) => {
            if (e.layer === layerName) {
                yValues.push(e.start.y);
            }
        });
        const count = yValues.length - 1;
        if (count < 2) {
            return [source];
        }
        yValues.sort();
        const result: CadData[] = Array(count);
        for (let i = 0; i < yValues.length - 1; i++) {
            result[i] = new CadData();
        }
        source.entities.forEach((e) => {
            if (e.layer === layerName) {
                return;
            }
            const {bottom: y1, top: y2} = e.boundingRect;
            const index = yValues.findIndex((v, i) => {
                if (i === 0) {
                    return false;
                }
                return yValues[i - 1] < y1 && v > y2;
            });
            if (index < 1) {
                return;
            }
            result[count - index].entities.add(e);
        });
        return result;
    }

    async toggleMode() {
        // if (this.mode === "edit") {
        //     location.reload();
        //     return;
        // } else {
        //     this.mode = "edit";
        // }
        this.mode = this.mode === "edit" ? "print" : "edit";
        await timeout(0);
        if (this.mode === "edit") {
            await this.initCad();
        } else {
            this.uninitCad();
            if (this.cad) {
                this.printParams.cads[0] = this.cad.data;
            }
            await this.generateSuanliaodan();
        }
    }

    async initCad() {
        const cad = this.cad;
        const container = this.cadContainer?.nativeElement;
        if (!cad || !container) {
            return;
        }
        await this.setZixuanpeijian();
        const {width, height} = container.getBoundingClientRect();
        cad.setConfig({width, height, padding: [10], hideLineLength: false});
        if (cad.dom.parentElement !== container) {
            container.appendChild(cad.dom);
        }
        // cad.data.entities.forEach((e) => (e.selectable = false));
        // this.comments.forEach((e) => (e.selectable = true));
        cad.on("entitiesselect", (entities) => {
            const data = cad.data.components.data;
            const ids = entities.toArray(true).map((e) => e.id);
            cad.unselectAll();
            entities.forEach((e) => (e.selected = true));
            for (const v of data) {
                const ids2 = v.entities.toArray(true).map((e) => e.id);
                if (intersection(ids, ids2).length > 0) {
                    v.entities.forEach((e) => (e.selected = true));
                }
            }
        });
        cad.on("entitiesunselect", (entities) => {
            const data = cad.data.components.data;
            const ids = entities.toArray(true).map((e) => e.id);
            data.forEach((v) => {
                const ids2 = v.entities.toArray(true).map((e) => e.id);
                if (intersection(ids, ids2).length > 0) {
                    v.entities.forEach((e) => (e.selected = false));
                }
            });
        });
        cad.on("moveentities", (entities, translate) => {
            const data = cad.data.components.data;
            const ids = entities.toArray(true).map((e) => e.id);
            data.forEach((v) => {
                const ids2 = v.entities.toArray(true).map((e) => e.id);
                if (intersection(ids, ids2).length > 0) {
                    let cadItem = this.zixuanpeijian.模块.flatMap((vv) => vv.cads).find((vv) => vv.displayedData?.id === v.id);
                    if (!cadItem) {
                        cadItem = this.zixuanpeijian.零散.find((vv) => vv.displayedData?.id === v.id);
                    }
                    if (cadItem) {
                        this._translateCadData(null, cadItem.info, ...translate);
                    }
                }
            });
        });
        cad.on("entitydblclick", async (event, entity) => {
            if (entity instanceof CadMtext) {
                const isComment = entity.info.isComment;
                const canModify = isNaN(Number(entity.text));
                if (isComment || canModify) {
                    const text = await this.message.prompt({
                        title: "备注",
                        promptData: {value: entity.text, validators: Validators.required, type: "textarea"}
                    });
                    if (text) {
                        if (!isComment) {
                            this.printParams.textMap[entity.text] = text;
                        }
                        entity.text = text;
                        this.cad?.render(entity);
                    }
                }
            }
        });
        cad.on("entitiesremove", (entities) => {
            const comments: CadMtext[] = [];
            for (const e of entities.mtext) {
                if (e.info.isComment) {
                    comments.push(e);
                } else {
                    this.printParams.textMap[e.text] = "";
                }
            }
            this.comments = this.comments.filter((e) => !comments.find((ee) => ee.id === e.id));
        });
        await cad.render();
        cad.center();
    }

    uninitCad() {
        const cad = this.cad;
        if (!cad) {
            return;
        }
        cad.destroy();
    }

    async openZixuanpeijianDialog() {
        const code = this.printParams.codes[0];
        if (!code) {
            this.message.alert("订单没保存，无法操作");
            return;
        }
        const data = await openZixuanpeijianDialog(this.dialog, {
            width: "calc(100vw - 20px)",
            height: "calc(100vh - 10px)",
            data: {
                step: 2,
                data: this.zixuanpeijian,
                checkEmpty: this.checkEmpty,
                cadConfig: {fontStyle: {family: this.printParams.config.fontStyle?.family}},
                materialResult: this.materialResult,
                dropDownKeys: this.printParams.dropDownKeys
            },
            disableClose: true
        });
        if (data) {
            this.zixuanpeijian = data;
            this.spinner.show(this.loaderId, {text: "正在保存自选配件"});
            await this.setZixuanpeijian();
            this.cad?.center();
            await this.setOrderZixuanpeijian();
            this.spinner.hide(this.loaderId);
        }
    }

    async setZixuanpeijian(resetTranslate = false) {
        const cad = this.cad;
        const cads: CadData[] = [];
        const cads2: CadData[] = [];
        const infos: ObjectOf<ZixuanpeijianInfo> = {};

        const setCadItem = (item: ZixuanpeijianCadItem) => {
            if (cad) {
                delete item.displayedData;
            }
            if (resetTranslate) {
                delete item.info.translate;
            }
            if (!item.displayedData) {
                item.displayedData = item.data.clone();
                const translate = item.info.translate;
                if (translate) {
                    item.displayedData.transform({translate}, true);
                }
            }
            if (!item.info.hidden && item.data.suanliaochuli.includes("显示展开")) {
                const data = item.displayedData;
                cads.push(data);
                cads2.push(item.data);
                infos[data.id] = item.info;
                for (const e of data.entities.dimension) {
                    if (e.mingzi === "<>") {
                        const points = item.data.getDimensionPoints(e);
                        if (points.length < 4) {
                            continue;
                        }
                        e.mingzi = toFixed(points[2].distanceTo(points[3]), 0);
                    }
                }
            }
        };

        const shuchubianliangKeys = new Set<string>();
        for (const key of this.printParams.dropDownKeys) {
            shuchubianliangKeys.add(key);
        }
        for (const item of this.zixuanpeijian.模块) {
            for (const cadItem of item.cads) {
                setCadItem(cadItem);
            }
            for (const v of item.shuchubianliang) {
                shuchubianliangKeys.add(v);
            }
        }
        for (const item of this.zixuanpeijian.零散) {
            setCadItem(item);
        }
        this.shuchubianliangKeys = Array.from(shuchubianliangKeys);
        if (cad) {
            cad.data.entities.mtext = cad.data.entities.mtext.filter((e) => !e.info.isComment);
            for (const e of this.comments) {
                this.addCommentText(e);
            }
        } else {
            this.printParams.cads[0].entities.mtext = this.printParams.cads[0].entities.mtext.filter((e) => !e.info.isComment);
            for (const e of this.comments) {
                this.printParams.cads[0].entities.add(e);
            }
        }
        if (cad) {
            const tol = 2;
            const toArrange: [number, CadData][] = [];
            cad.data.components.data = cads;
            await cad.reset().render();
            for (const [i, v] of cads.entries()) {
                const info = infos[v.id];
                if (!info.translate) {
                    toArrange.push([i, v]);
                }
                const lineLengthMap: ObjectOf<{text: string; mtext: CadMtext}> = {};
                const shaungxiangCads = splitShuangxiangCad(v);
                const shaungxiangRects = getShuangxiangLineRects(shaungxiangCads);
                v.entities.forEach((e) => {
                    if (e instanceof CadLineLike) {
                        if (!e.hideLength) {
                            const mtext = e.children.mtext.find((ee) => ee.info.isLengthText);
                            if (mtext) {
                                lineLengthMap[e.id] = {text: mtext.text, mtext};
                            }
                        }
                        const length = e.length;
                        if (e instanceof CadLine && length > maxLineLength * v.suanliaodanZoom) {
                            setLinesLength(v, [e], maxLineLength);
                        }
                    }
                });
                const rect = v.getBoundingRect();
                v.transform({scale: v.suanliaodanZoom, origin: [rect.x, rect.y]}, true);
                await cad.render(v.getAllEntities());
                setShuangxiangLineRects(shaungxiangCads, shaungxiangRects);
                await cad.render(v.getAllEntities());
                v.entities.toArray().forEach((e) => {
                    if (e instanceof CadLineLike && e.id in lineLengthMap) {
                        e.hideLength = true;
                        const {text, mtext} = lineLengthMap[e.id];
                        const mtext2 = mtext.clone(true);
                        mtext2.text = text;
                        mtext2.fontStyle.size = 24;
                        v.entities.add(mtext2);
                    }
                });
                configCadDataForPrint(cad, v, this.printParams, true);
                showIntersections(v, this.status.getProjectConfig());
            }

            for (const v of cads) {
                await cad.render(v.getAllEntities());
                const rect = v.getBoundingRect();
                const info = infos[v.id];
                let zhankaiText = v.entities.mtext.find((e) => e.info.isZhankaiText);
                if (!zhankaiText) {
                    zhankaiText = new CadMtext({info: {isZhankaiText: true}});
                    v.entities.add(zhankaiText);
                }
                // zhankaiText.calcBoundingRect = false;
                zhankaiText.fontStyle.size = 34;
                zhankaiText.text = this.getCalcZhankaiText(v, info);
                zhankaiText.anchor.set(0, 0);
                zhankaiText.insert.set(rect.left, rect.bottom - 10);
                await cad.render(zhankaiText);
            }

            if (toArrange.length > 0) {
                if (toArrange.length === cads.length) {
                    let hLinesMaxLength = -1;
                    const hLines: CadLine[] = [];
                    let vLinesMaxLength = -1;
                    const vLines: CadLine[] = [];
                    cad.data.entities.line.forEach((e) => {
                        if (e.isHorizontal()) {
                            hLines.push(e);
                            hLinesMaxLength = Math.max(hLinesMaxLength, e.length);
                        } else if (e.isVertical()) {
                            vLines.push(e);
                            vLinesMaxLength = Math.max(vLinesMaxLength, e.length);
                        }
                    });
                    const hLines2 = hLines.filter((e) => Math.abs(e.length - hLinesMaxLength) < tol);
                    hLines2.sort((a, b) => a.start.y - b.start.y);
                    const vLines2 = vLines.filter((e) => Math.abs(e.length - vLinesMaxLength) < tol);
                    vLines2.sort((a, b) => a.start.x - b.start.x);
                    const leftLine = vLines2[0];
                    const bottomLine1 = hLines2[0];
                    const bottomLine2 = hLines2[1];
                    let bottomLine: CadLine;
                    if (bottomLine2 && bottomLine2.start.y - bottomLine1.start.y < 500) {
                        bottomLine = bottomLine2;
                    } else {
                        bottomLine = bottomLine1;
                    }
                    const leftLineX = leftLine.maxX;
                    const hLines3 = hLines.filter(
                        (e) =>
                            e.start.y > bottomLine.start.y && (Math.abs(e.start.x - leftLineX) < tol || Math.abs(e.end.x - leftLineX) < tol)
                    );
                    hLines3.sort((a, b) => a.start.y - b.start.y);
                    const left = leftLine.start.x;
                    const bottom = bottomLine.start.y;
                    const right = leftLine.start.x + hLines3[0].length;
                    const top = hLines3[0].start.y;
                    const cols = toArrange.length > 6 ? 3 : 2;
                    const boxWidth = (right - left) / cols;
                    const boxHeight = (top - bottom) / 3;
                    for (const [i, v] of toArrange) {
                        const x = left + (i % cols) * boxWidth + boxWidth / 2;
                        const y = top - Math.floor(i / cols) * boxHeight - boxHeight / 2;
                        const rect2 = v.getBoundingRect();
                        const dx = x - rect2.x;
                        const dy = y - rect2.y;
                        this._translateCadData(v, infos[v.id], dx, dy);
                        await cad.render(v.getAllEntities());
                    }
                } else {
                    const rectBg = cad.data.entities.getBoundingRect();
                    const rects = toArrange.map(([, v]) => v.getBoundingRect());
                    const spaceX = 50;
                    const spaceY = 50;
                    const height = rects.reduce((a, b) => a + b.height, 0) + spaceY * (rects.length - 1);
                    let currY = rectBg.y + height / 2;
                    for (const [i, [, v]] of toArrange.entries()) {
                        const rect = rects[i];
                        const dx = rectBg.right - rect.left + spaceX;
                        const dy = currY - rect.top;
                        this._translateCadData(v, infos[v.id], dx, dy);
                        currY -= rect.height + spaceY;
                        await cad.render(v.getAllEntities());
                    }
                }
            }
        } else {
            this.printParams.cads[0].components.data = cads;
        }
    }

    async setOrderZixuanpeijian() {
        const {codes, type} = this.printParams;
        const cad = this.cad;
        if (!cad) {
            return;
        }
        const getCadItem = (item: ZixuanpeijianCadItem) => ({
            ...item,
            data: item.data.export(),
            displayedData: item.displayedData?.export()
        });
        const 模块 = this.zixuanpeijian.模块.map((item) => ({
            ...item,
            cads: item.cads.map(getCadItem)
        }));
        const 零散 = this.zixuanpeijian.零散.map(getCadItem);
        const 备注 = this.comments.map((v) => v.export());
        const 文本映射 = this.printParams.textMap;
        const 输出变量: ObjectOf<string> = {};
        const materialResult = this.materialResult;
        for (const key of this.shuchubianliangKeys) {
            输出变量[key] = key in materialResult ? String(materialResult[key]) : "";
        }
        await this.dataService.post<void>("ngcad/setOrderZixuanpeijian", {
            code: codes[0],
            type,
            data: {模块, 零散, 备注, 文本映射, 输出变量}
        });
    }

    async getOrderImage() {
        const response = await this.dataService.post<{prefix: string; data: {zhengmiantu: string}[]}>("order/api/getImage", {
            code: this.printParams.codes[0],
            type: this.printParams.type
        });
        if (response?.data && response.data.data?.length > 0) {
            const {prefix, data} = response.data;
            this.orderImageUrl = data[0].zhengmiantu ? prefix + data[0].zhengmiantu : "";
        }
    }

    async uploadOrderImage(event: Event) {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (!files || files.length < 1) {
            return;
        }
        let file = files[0];
        const blob = await imageCompression(file, {maxSizeMB: 1, useWebWorker: true});
        file = new File([blob], file.name, {type: file.type});
        target.value = "";
        const response = await this.dataService.post<{prefix: string; save_path: string}>("order/api/uploadImage", {
            code: this.printParams.codes[0],
            type: this.printParams.type,
            field: "zhengmiantu",
            file
        });
        if (response?.data) {
            const {prefix, save_path} = response.data;
            this.orderImageUrl = prefix + save_path;
            const cad = this.cad;
            if (cad) {
                cad.data.entities.image
                    .filter((e) => e.info.designPicKey === "设计图")
                    .forEach((e) => {
                        e.url = this.orderImageUrl;
                        cad.render(e);
                    });
            }
            const 设计图 = this.printParams.designPics.设计图;
            if (设计图) {
                设计图.urls = 设计图.urls.map((v) => v.map((_) => this.orderImageUrl));
            }
        }
    }

    async addCommentText(mtext?: CadMtext) {
        const cad = this.cad;
        if (!cad) {
            return;
        }
        if (!mtext) {
            const text = await this.message.prompt({title: "备注", promptData: {validators: Validators.required, type: "textarea"}});
            if (!text) {
                return;
            }
            mtext = new CadMtext({text});
            const rect = cad.data.getBoundingRect();
            mtext.anchor.set(0, 0.5);
            mtext.insert.set(rect.right + 50, rect.y);
            this.comments.push(mtext);
        }
        mtext.fontStyle.size = 40;
        mtext.info.isComment = true;
        cad.add(mtext);
    }

    clearHttpCache() {
        session.remove(this._httpCacheKey);
    }

    async resetTextMap() {
        this.printParams.textMap = {};
        this.spinner.show(this.loaderId, {text: "正在保存自选配件"});
        await this.setZixuanpeijian();
        await this.setOrderZixuanpeijian();
        this.spinner.hide(this.loaderId);
    }

    async resetTranslate() {
        await this.setZixuanpeijian(true);
        this.cad?.center();
    }

    getCalcZhankaiText(cad: CadData, info: ZixuanpeijianInfo) {
        const materialResult = this.materialResult || {};
        const CAD来源 = "算料";

        const calcZhankai = info.zhankai.flatMap((v) => {
            let cadZhankai: CadZhankai | undefined;
            if (v.cadZhankaiIndex && v.cadZhankaiIndex > 0) {
                cadZhankai = cad.zhankai[v.cadZhankaiIndex];
            }
            if (!cadZhankai && cad.zhankai.length > 0) {
                cadZhankai = new CadZhankai(cad.zhankai[0].export());
                cadZhankai.zhankaikuan = v.width;
                cadZhankai.zhankaigao = v.height;
                cadZhankai.shuliang = v.num;
            }
            if (!cadZhankai) {
                return {};
            }
            const calc: ObjectOf<any> = {
                name: cadZhankai.name,
                kailiao: cadZhankai.kailiao,
                kailiaomuban: cadZhankai.kailiaomuban,
                neikaimuban: cadZhankai.neikaimuban,
                chai: cadZhankai.chai,
                flip: cadZhankai.flip,
                flipChai: cadZhankai.flipChai,
                neibugongshi: cadZhankai.neibugongshi,
                calcW: Number(v.width),
                calcH: Number(v.height),
                num: Number(v.num),
                包边正面按分类拼接: cadZhankai.包边正面按分类拼接,
                属于正面部分: false,
                属于框型部分: false,
                默认展开宽: !!nameEquals(cadZhankai.zhankaikuan, [
                    "ceil(总长)+0",
                    "ceil(总长)+0+(总使用差值)",
                    "总长+(总使用差值)",
                    "总长+0+(总使用差值)"
                ])
            };
            ["门扇上切", "门扇下切", "门扇上面上切", "门扇下面下切"].forEach((qiekey) => {
                if (cadZhankai?.zhankaigao.includes(qiekey) && materialResult[qiekey] > 0) {
                    if (qiekey.includes("上切")) {
                        calc["上切"] = materialResult[qiekey];
                    } else {
                        calc["下切"] = materialResult[qiekey];
                    }
                }
            });
            if (cadZhankai.chai) {
                calc.num = 1;
                const calc2 = [];
                calc2.push(calc);
                for (let i = 1; i < calc.num; i++) {
                    const calc1 = JSON.parse(JSON.stringify(calc));
                    if (!calc1.flip) {
                        calc1.flip = [];
                    }
                    calc1.name = `${cadZhankai.name}${i}`;
                    calc2.push(calc1);
                }
                return calc2;
            }
            return calc;
        });
        info.calcZhankai = calcZhankai;
        let 板材 = info.bancai?.mingzi || "";
        if (info.bancai && 板材 === "自定义") {
            板材 = info.bancai.zidingyi || "";
        }
        const 板材厚度 = info.bancai?.houdu || "";
        const 材料 = info.bancai?.cailiao || "";
        const 项目配置 = this.status.getProjectConfig();
        const 项目名 = this.status.project;
        const CAD属性 = {
            name: cad.name,
            suanliaodanxianshibancai: cad.suanliaodanxianshibancai,
            shuangxiangzhewan: cad.shuangxiangzhewan,
            算料单展开显示位置: cad.算料单展开显示位置,
            算料特殊要求: cad.算料特殊要求,
            suanliaodanxianshi: cad.suanliaodanxianshi,
            suanliaochuli: cad.suanliaochuli,
            kailiaoshibaokeng: cad.kailiaoshibaokeng,
            zhidingweizhipaokeng: cad.zhidingweizhipaokeng,
            gudingkailiaobancai: cad.gudingkailiaobancai,
            houtaiFenlei: cad.type,
            bancaiwenlifangxiang: cad.bancaiwenlifangxiang,
            zhankai: cad.zhankai,
            overrideShuliang: undefined,
            xianshimingzi: cad.xianshimingzi,
            attributes: cad.attributes
        };

        const text = getCalcZhankaiText(CAD来源, calcZhankai, materialResult, 板材, 板材厚度, 材料, 项目配置, 项目名, CAD属性);
        return text;
    }
}
