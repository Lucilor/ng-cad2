import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {session, setGlobal, timer} from "@app/app.common";
import {configCadDataForPrint, maxLineLength, printCads, PrintCadsParams} from "@app/cad.utils";
import {CadData, CadLine, CadLineLike, CadMtext, CadViewer, setLinesLength} from "@cad-viewer";
import {openZixuanpeijianDialog, ZixuanpeijianInfo, ZixuanpeijianOutput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {Formulas} from "@src/app/utils/calc";
import {downloadByUrl, MatrixLike, ObjectOf, timeout} from "@utils";
import {
    slideInDownOnEnterAnimation,
    slideInRightOnEnterAnimation,
    slideOutRightOnLeaveAnimation,
    slideOutUpOnLeaveAnimation
} from "angular-animations";
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
                margin: 10,
                showSmall: true,
                showLarge: false
            },
            花件图: {
                urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
                margin: 10,
                showSmall: true,
                showLarge: false
            }
        },
        extra: {
            拉手信息宽度: 578
        },
        url: "",
        keepCad: true,
        info: {},
        orders: []
    };
    cad: CadViewer | null = null;
    zixuanpeijian: ZixuanpeijianOutput = [];
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
    @ViewChild("cadContainer", {read: ElementRef}) cadContainer?: ElementRef<HTMLDivElement>;

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private sanitizer: DomSanitizer,
        private message: MessageService,
        private spinner: SpinnerService,
        private dialog: MatDialog
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
            const response = await this.dataService.get<Formulas>("", {}, {testData: "materialResult"});
            this.printParams.orders[0] = {materialResult: response?.data ? response.data : {}};
            if (this.printParams.cads.length > 0) {
                await this.generateSuanliaodan();
            }
            return;
        }
        this.spinner.show(this.loaderId, {text: "正在获取数据..."});
        try {
            const response = await this.dataService.post<PrintCadsParams>(action, queryParams, {encrypt: "both"});
            if (response?.data) {
                response.data.cads = response.data.cads.map((v) => new CadData(v));
                this.downloadUrl = response.data.url || null;
                this.printParams = {...this.printParams, ...response.data};
                this.printParams.info.title = "算料单" + this.printParams.codes.join("、");
                const {codes, type} = this.printParams;
                if (codes.length === 1) {
                    const response2 = await this.dataService.post<{模块: ZixuanpeijianOutput; 备注: CadMtext[]}>(
                        "ngcad/getOrderZixuanpeijian",
                        {
                            code: codes[0],
                            type
                        }
                    );
                    if (response2?.data) {
                        const {模块, 备注} = response2.data;
                        for (const item of 模块) {
                            for (const cad of item.cads) {
                                cad.data = new CadData(cad.data);
                                if (cad.displayedData) {
                                    cad.displayedData = new CadData(cad.displayedData);
                                }
                            }
                        }
                        this.zixuanpeijian = 模块;
                        this.comments = 备注.map((v) => new CadMtext(v));
                    } else {
                        this.zixuanpeijian = [];
                    }
                    this.enableZixuanpeijian = true;
                } else {
                    this.enableZixuanpeijian = false;
                }
                await this.setZixuanpeijian(false);
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
        this.setZixuanpeijian(false);
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
            data.forEach((v) => {
                const ids2 = v.entities.toArray(true).map((e) => e.id);
                if (intersection(ids, ids2).length > 0) {
                    v.entities.forEach((e) => (e.selected = true));
                }
            });
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
                    const cadItem = this.zixuanpeijian.flatMap((vv) => vv.cads).find((vv) => vv.displayedData?.id === v.id);
                    if (cadItem) {
                        if (cadItem.data.info.translate) {
                            const [x, y] = cadItem.data.info.translate;
                            cadItem.data.info.translate = [x + translate[0], y + translate[1]];
                        } else {
                            cadItem.data.info.translate = translate;
                        }
                    }
                }
            });
        });
        cad.on("entitydblclick", async (event, entity) => {
            if (entity instanceof CadMtext && entity.info.isComment) {
                const text = await this.message.prompt({
                    title: "备注",
                    promptData: {value: entity.text, validators: Validators.required, type: "textarea"}
                });
                if (text) {
                    entity.text = text;
                    this.cad?.render(entity);
                }
            }
        });
        cad.on("entitiesremove", (entities) => {
            const comments = entities.mtext.filter((e) => e.info.isComment).map((e) => e.id);
            this.comments = this.comments.filter((e) => !comments.includes(e.id));
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
        this.syncZixuanpeijian();
    }

    async openZixuanpeijianDialog() {
        const data = await openZixuanpeijianDialog(this.dialog, {
            width: "calc(100vw - 20px)",
            height: "calc(100vh - 10px)",
            data: {
                step: 1,
                data: this.zixuanpeijian,
                checkEmpty: this.checkEmpty,
                cadConfig: {fontStyle: {family: this.printParams.config.fontStyle?.family}},
                materialResult: this.printParams.orders[0]?.materialResult
            },
            disableClose: true
        });
        if (data) {
            this.zixuanpeijian = data;
            this.spinner.show(this.loaderId, {text: "正在保存自选配件"});
            await this.setZixuanpeijian(true);
            await this.setOrderZixuanpeijian();
            this.spinner.hide(this.loaderId);
        }
    }

    async setZixuanpeijian(arrangeCads: boolean) {
        const cad = this.cad;
        const cads: CadData[] = [];
        const cads2: CadData[] = [];
        const infos: ObjectOf<ZixuanpeijianInfo> = {};
        for (const item of this.zixuanpeijian) {
            for (const cadItem of item.cads) {
                if (cad) {
                    delete cadItem.displayedData;
                }
                if (!cadItem.displayedData) {
                    cadItem.displayedData = cadItem.data.clone();
                }
                if (!cadItem.data.info.hidden) {
                    cads.push(cadItem.displayedData);
                    cads2.push(cadItem.data);
                    infos[cadItem.displayedData.id] = cadItem.info;
                }
            }
        }
        for (const e of this.comments) {
            if (cad) {
                cad.data.entities.mtext = cad.data.entities.mtext.filter((ee) => !ee.info.isComment);
                this.addCommentText(e);
            } else {
                this.printParams.cads[0].entities.add(e);
            }
        }
        if (cad) {
            const tol = 2;
            cad.data.components.data = cads;
            for (const v of cads) {
                if (v.info.自选配件已初始化) {
                    continue;
                }
                const lineLengthMap: ObjectOf<{text: string; mtext: CadMtext}> = {};
                v.entities.forEach((e) => {
                    if (e instanceof CadLineLike) {
                        const length = e.length;
                        const mtext = e.children.mtext.find((ee) => ee.info.isLengthText);
                        if (mtext) {
                            lineLengthMap[e.id] = {text: mtext.text, mtext};
                        }
                        if (e instanceof CadLine && length > maxLineLength * v.suanliaodanZoom) {
                            setLinesLength(v, [e], maxLineLength);
                        }
                    }
                });
                const rect = v.getBoundingRect();
                v.transform({scale: v.suanliaodanZoom, origin: [rect.x, rect.y]}, true);
                await cad.render(v.entities);
                v.entities.toArray().forEach((e) => {
                    if (e instanceof CadLineLike && e.id in lineLengthMap) {
                        e.hideLength = true;
                        const {text,mtext} = lineLengthMap[e.id];
                        const mtext2 = mtext.clone(true);
                        mtext2.text = text;
                        mtext2.fontStyle.size = 24;
                        v.entities.add(mtext2);
                    }
                });
                v.info.自选配件已初始化 = true;
                configCadDataForPrint(cad, v, this.printParams);
            }
            if (arrangeCads) {
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
                    (e) => e.start.y > bottomLine.start.y && (Math.abs(e.start.x - leftLineX) < tol || Math.abs(e.end.x - leftLineX) < tol)
                );
                hLines3.sort((a, b) => a.start.y - b.start.y);
                const left = leftLine.start.x;
                const bottom = bottomLine.start.y;
                const right = leftLine.start.x + hLines3[0].length;
                const top = hLines3[0].start.y;
                const cols = cads.length > 6 ? 3 : 2;
                const boxWidth = (right - left) / cols;
                const boxHeight = (top - bottom) / 3;
                for (const [i, v] of cads.entries()) {
                    const x = left + (i % cols) * boxWidth + boxWidth / 2;
                    const y = top - Math.floor(i / cols) * boxHeight - boxHeight / 2;
                    const rect2 = v.getBoundingRect();
                    const matrix: MatrixLike = {translate: [x - rect2.x, y - rect2.y]};
                    v.transform(matrix, true);
                    cads2[i].transform(matrix, true);
                }
            }
            await cad.reset().render();
            for (const v of cads) {
                const info = infos[v.id];
                let zhankaiText = v.entities.mtext.find((e) => e.info.isZhankaiText);
                if (!zhankaiText) {
                    zhankaiText = new CadMtext({info: {isZhankaiText: true}});
                    v.entities.add(zhankaiText);
                }
                zhankaiText.calcBoundingRect = false;
                zhankaiText.fontStyle.size = 34;
                const {zhankai, bancai} = info;
                const {width, height, num} = zhankai[0];
                const getText = (t?: string) => (t || "").trim();
                zhankaiText.text = `${getText(width)}×${getText(height)}=${getText(num)}`;
                if (bancai) {
                    const {mingzi, cailiao, houdu} = bancai;
                    zhankaiText.text += `\n${getText(houdu)}/${getText(cailiao)}/${getText(mingzi)}`;
                }
                const rect = v.getBoundingRect();
                zhankaiText.anchor.set(0, 0);
                zhankaiText.insert.set(rect.left, rect.bottom - 10);
                cad.render(zhankaiText);
            }
        } else {
            this.printParams.cads[0].components.data = cads;
        }
    }

    syncZixuanpeijian() {
        for (const item of this.zixuanpeijian) {
            for (const cadItem of item.cads) {
                const translate = cadItem.data.info.translate;
                if (translate) {
                    cadItem.data.transform({translate}, true);
                }
                delete cadItem.data.info.translate;
            }
        }
    }

    async setOrderZixuanpeijian() {
        const {codes, type} = this.printParams;
        const cad = this.cad;
        if (!cad) {
            return;
        }
        this.syncZixuanpeijian();
        const 模块 = this.zixuanpeijian.map((item) => ({
            ...item,
            cads: item.cads.map((cadItem) => ({
                ...cadItem,
                data: cadItem.data.export(),
                displayedData: cadItem.displayedData?.export()
            }))
        }));
        const 备注 = this.comments.map((v) => v.export());
        await this.dataService.post<void>("ngcad/setOrderZixuanpeijian", {code: codes[0], type, data: {模块, 备注}});
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
        const file = files[0];
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
}
