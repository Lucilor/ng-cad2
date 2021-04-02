import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {CadData, CadDimension} from "@src/app/cad-viewer";
import {printCads} from "@src/app/cad.utils";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {timeout} from "@src/app/utils";
import {NgxUiLoaderService} from "ngx-ui-loader";
import printJS from "print-js";

type ResponseData = {
    cads: CadData[];
    linewidth: number;
    renderStyle: CadDimension["renderStyle"];
};

@Component({
    selector: "app-print-cad",
    templateUrl: "./print-cad.component.html",
    styleUrls: ["./print-cad.component.scss"]
})
export class PrintCadComponent implements AfterViewInit, OnDestroy {
    loaderId = "printLoader";
    loaderText = "";
    pdfUrlRaw?: string;
    pdfUrl?: SafeUrl;
    cads: CadData[] = [];
    linewidth = 1;
    renderStyle = 2;

    constructor(
        private loader: NgxUiLoaderService,
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private message: MessageService,
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
            this.message.alert("缺少action");
            return;
        }
        this.loader.startLoader(this.loaderId);
        this.loaderText = "正在获取数据...";
        const response = await this.dataService.post<ResponseData>(action, queryParams, false);
        if (response?.data) {
            this.loaderText = "正在生成算料单...";
            this.cads = response.data.cads.map((v) => new CadData(v));
            this.linewidth = response.data.linewidth;
            this.renderStyle = response.data.renderStyle;
            this.pdfUrlRaw = await printCads(this.cads, {}, this.linewidth, this.renderStyle);
            this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrlRaw);
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
}
