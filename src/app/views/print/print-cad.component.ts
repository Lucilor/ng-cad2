import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {session, timer} from "@app/app.common";
import {printCads, PrintCadsParams} from "@app/cad.utils";
import {CadData} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {timeout} from "@utils";
import {
    slideInDownOnEnterAnimation,
    slideInRightOnEnterAnimation,
    slideOutRightOnLeaveAnimation,
    slideOutUpOnLeaveAnimation
} from "angular-animations";
import {NgxUiLoaderService} from "ngx-ui-loader";
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
    loaderText = "";
    pdfUrlRaw?: string;
    pdfUrl?: SafeUrl;
    showDxfInput = false;
    private _showDesignPicsKey = "printCad-showDesignPics";
    private _paramKey = "printCad-paramCache";
    showDesignPics = Boolean(session.load(this._showDesignPicsKey));
    private _fontFamilyKey = "printCad-fontFamily";
    private _fontFamily = session.load(this._fontFamilyKey) || "微软雅黑";
    get fontFamily() {
        return this._fontFamily;
    }
    set fontFamily(value) {
        this._fontFamily = value;
        session.save(this._fontFamilyKey, value);
    }
    toolbarVisible = true;

    constructor(
        private loader: NgxUiLoaderService,
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private sanitizer: DomSanitizer
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
            const param = session.load<PrintCadsParams>(this._paramKey);
            if (param) {
                param.cads = param.cads.map((v) => new CadData(v));
                await this.generateSuanliaodan(param);
            }
            return;
        }
        this.loader.startLoader(this.loaderId);
        this.loaderText = "正在获取数据...";
        const response = await this.dataService.post<PrintCadsParams>(action, queryParams, "both");
        if (response?.data) {
            response.data.cads = response.data.cads.map((v) => new CadData(v));
            await this.generateSuanliaodan(response.data);
        }
        this.loader.stopLoader(this.loaderId);
        window.addEventListener("keydown", this._onKeyDown);
    }

    ngOnDestroy() {
        window.removeEventListener("keydown", this._onKeyDown);
    }

    async print() {
        printJS({printable: this.pdfUrlRaw, type: "pdf"});
    }

    async generateSuanliaodan(params: PrintCadsParams) {
        this.loaderText = "正在生成算料单...";
        timer.start(this.loaderId);
        this.pdfUrlRaw = await printCads(params);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrlRaw);
        timer.end(this.loaderId, "生成算料单");
    }

    async uploadDxf(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.item(0);
        if (!file) {
            return;
        }
        this.loader.startLoader(this.loaderId);
        const data = await this.dataService.uploadDxf(file);
        if (!data) {
            return;
        }
        const param: PrintCadsParams = {
            cads: [data],
            linewidth: 2,
            config: {fontFamily: this.fontFamily},
            extra: {
                拉手信息宽度: 578
            }
        };
        if (this.showDesignPics) {
            param.designPics = {
                urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
                margin: 10
            };
        }
        await this.generateSuanliaodan(param);
        this.loader.stopLoader(this.loaderId);
        const cads = param.cads.map((v) => v.export());
        session.save(this._paramKey, {...param, cads});
    }

    setShowDesignPics(event: MatSlideToggleChange) {
        this.showDesignPics = event.checked;
        session.save(this._showDesignPicsKey, this.showDesignPics);
    }

    toggleToolbarVisible() {
        this.toolbarVisible = !this.toolbarVisible;
    }
}
