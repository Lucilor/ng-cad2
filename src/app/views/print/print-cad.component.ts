import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {session, timer} from "@app/app.common";
import {printCads, PrintCadsParams} from "@app/cad.utils";
import {CadData} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {downloadByUrl, timeout} from "@utils";
import {
    slideInDownOnEnterAnimation,
    slideInRightOnEnterAnimation,
    slideOutRightOnLeaveAnimation,
    slideOutUpOnLeaveAnimation
} from "angular-animations";
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
    printParams: Required<PrintCadsParams> = {
        cads: [],
        config: {fontFamily: this.fonts[0]},
        linewidth: 2,
        dimStyle: {},
        designPics: {
            urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
            margin: 10,
            showSmall: false,
            showLarge: false
        },
        extra: {
            拉手信息宽度: 578
        },
        url: ""
    };

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private sanitizer: DomSanitizer,
        private message: MessageService,
        private spinner: SpinnerService
    ) {}

    private _onKeyDown = ((event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === "p") {
            event.preventDefault();
            this.print();
        }
    }).bind(this);

    async ngAfterViewInit() {
        await timeout(0);
        const queryParams = {...this.route.snapshot.queryParams};
        const action = queryParams.action as string;
        delete queryParams.action;
        if (!action) {
            this.showDxfInput = true;
            this._loadPrintParams();
            if (this.printParams.cads.length > 0) {
                await this.generateSuanliaodan(this.printParams);
            }
            return;
        }
        this.spinner.show(this.loaderId, {text: "正在获取数据..."});
        const response = await this.dataService.post<PrintCadsParams>(action, queryParams, {encrypt: "both"});
        if (response?.data) {
            response.data.cads = response.data.cads.map((v) => new CadData(v));
            this.downloadUrl = response.data.url || null;
            await this.generateSuanliaodan(response.data);
        } else {
            this.spinner.hide(this.loaderId);
        }
        window.addEventListener("keydown", this._onKeyDown);
    }

    ngOnDestroy() {
        window.removeEventListener("keydown", this._onKeyDown);
    }

    private _loadPrintParams() {
        const params = session.load<Required<PrintCadsParams>>(this._paramKey);
        if (params) {
            this.printParams = params;
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

    async generateSuanliaodan(params: PrintCadsParams) {
        timer.start(this.loaderId);
        this.spinner.show(this.loaderId, {text: "正在生成算料单..."});
        const cads = params.cads.map((v) => this.splitCads(v)).flat();
        const {url, errors} = await printCads({...params, cads});
        this.spinner.hide(this.loaderId);
        if (errors.length > 0) {
            // this.message.alert({content: new Error(errors.join("<br>"))});
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
        await this.generateSuanliaodan(this.printParams);
        this.spinner.hide(this.loaderId);
        this._savePrintParams();
    }

    toggleToolbarVisible() {
        this.toolbarVisible = !this.toolbarVisible;
    }

    downloadDxf() {
        if (this.downloadUrl !== null) {
            downloadByUrl(this.downloadUrl);
        } else {
            this.message.alert("没有提供下载地址");
        }
    }

    async editDesignPics() {
        const urls = await this.message.prompt(
            {promptData: {type: "textarea", value: this.printParams.designPics.urls[0].join("\n")}},
            {width: "50vw"}
        );
        if (urls !== null) {
            this.printParams.designPics.urls = [
                urls
                    .split("\n")
                    .map((v) => v.trim())
                    .filter((v) => v !== "")
            ];
            this._savePrintParams();
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
        if (yValues.length < 3) {
            return [source];
        }
        yValues.sort();
        const result: CadData[] = Array(yValues.length - 1);
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
            result[index - 1].entities.add(e);
        });
        return result;
    }
}
