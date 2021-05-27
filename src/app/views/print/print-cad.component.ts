import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {timer} from "@app/app.common";
import {printCads} from "@app/cad.utils";
import {CadData} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {timeout} from "@utils";
import {NgxUiLoaderService} from "ngx-ui-loader";
import printJS from "print-js";

type PrintParameters = Parameters<typeof printCads>;
type ResponseData = {
    cads: PrintParameters["0"];
    linewidth?: PrintParameters["2"];
    renderStyle?: PrintParameters["3"];
    designPics?: PrintParameters["4"];
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
    showDxfInput = false;

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
            this.showDxfInput = true;
            return;
        }
        this.loader.startLoader(this.loaderId);
        this.loaderText = "正在获取数据...";
        const response = await this.dataService.post<ResponseData>(action, queryParams, "both");
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

    async generateSuanliaodan(data: ResponseData) {
        const {cads, linewidth, renderStyle, designPics} = data;
        this.loaderText = "正在生成算料单...";
        timer.start(this.loaderId);
        this.pdfUrlRaw = await printCads(cads, {}, linewidth, renderStyle, designPics);
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
        await this.generateSuanliaodan({
            cads: [data],
            designPics: {
                urls: [["/n/static/images/算料单效果图1.jpg", "/n/static/images/算料单效果图2.jpg"]],
                margin: 10
            },
            linewidth: 2
        });
        this.loader.stopLoader(this.loaderId);
        this.showDxfInput = false;
    }
}
