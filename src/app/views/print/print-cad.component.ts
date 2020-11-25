import {AfterViewInit, Component} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {logTime} from "@src/app/app.common";
import {CadData} from "@src/app/cad-viewer";
import {printCads} from "@src/app/cad.utils";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {timeout} from "@src/app/utils";
import {environment} from "@src/environments/environment";
import {NgxUiLoaderService} from "ngx-ui-loader";

@Component({
    selector: "app-print-cad",
    templateUrl: "./print-cad.component.html",
    styleUrls: ["./print-cad.component.scss"]
})
export class PrintCadComponent implements AfterViewInit {
    loaderId = "printLoader";
    loaderText = "";

    constructor(
        private loader: NgxUiLoaderService,
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private message: MessageService
    ) {}

    async ngAfterViewInit() {
        await timeout(0);
        const queryParams = {...this.route.snapshot.queryParams};
        const action = queryParams.action;
        delete queryParams.action;
        if (!action) {
            this.message.alert("缺少action");
            return;
        }
        this.loader.startLoader(this.loaderId);
        this.loaderText = "正在获取数据...";
        const t1 = performance.now();
        const response = await this.dataService.request<CadData[]>(action, "POST", queryParams, false);
        logTime("请求数据用时", t1);
        const data = response?.data?.map((v) => new CadData(v));
        if (data) {
            this.loaderText = "正在打印CAD...";
            const t2 = performance.now();
            const url = await printCads(data);
            logTime("打印用时", t2);
            if (environment.production) {
                location.href = url;
            } else {
                window.open(url);
            }
        }
        this.loader.stopLoader(this.loaderId);
    }
}
