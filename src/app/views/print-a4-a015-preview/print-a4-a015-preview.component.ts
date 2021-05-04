import {Component, ChangeDetectorRef, OnDestroy, AfterViewInit} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {CadViewer, CadData} from "@src/app/cad-viewer";
import {ActivatedRoute} from "@angular/router";
import {cloneDeep} from "lodash";
import {timeout} from "@lucilor/utils";

export type PreviewData = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CAD?: any;
    code: string;
    codeText?: string;
    text: string[];
    type: "说明" | "CAD";
    zhankai: string;
    title?: string;
    cadImg: SafeUrl;
}[][];

@Component({
    selector: "app-print-a4-a015-preview",
    templateUrl: "./print-a4-a015-preview.component.html",
    styleUrls: ["./print-a4-a015-preview.component.scss"]
})
export class PrintA4A015PreviewComponent implements AfterViewInit, OnDestroy {
    data: PreviewData = [];
    printing = false;
    loaderId = "printPreview";
    loadingText = "";

    constructor(
        private cd: ChangeDetectorRef,
        private sanitizer: DomSanitizer,
        private dataService: CadDataService,
        private loader: NgxUiLoaderService,
        private route: ActivatedRoute
    ) {}

    async ngAfterViewInit() {
        Object.assign(window, {app: this});
        document.body.style.overflowX = "hidden";
        document.body.style.overflowY = "auto";
        const {id, zhankai: zhankai2} = this.route.snapshot.queryParams;
        const response = await this.dataService.post<PreviewData>("order/printCode/printA4A015Preview", {id}, "no");
        if (!response?.data) {
            return;
        }
        this.data = response.data;
        if (zhankai2) {
            this.data.forEach((v, i) => {
                const toAdd: PreviewData[0] = [];
                v.forEach((vv) => {
                    const calcZhankai = vv.CAD?.calcZhankai;
                    const zhankai = vv.CAD?.zhankai;
                    if (Array.isArray(calcZhankai)) {
                        for (let j = 0; j < calcZhankai.length; j++) {
                            const clone = cloneDeep(vv);
                            clone.CAD.calcW = calcZhankai[j][0];
                            clone.CAD.calcH = calcZhankai[j][1];
                            clone.CAD.num = zhankai[j][2];
                            if (zhankai[j][4]) {
                                clone.CAD.peihe = zhankai[j][4];
                            }
                            toAdd.push(clone);
                        }
                    }
                });
                this.data[i] = v.concat(toAdd);
            });
        }
        const total = this.data.reduce((sum, v) => sum + v.length, 0);
        let done = 0;
        this.loader.startLoader(this.loaderId);
        this.loadingText = `0 / ${total}`;
        for (const page of this.data) {
            for (const card of page) {
                if (card.type === "CAD") {
                    const cad = new CadViewer(new CadData(card.CAD), {
                        padding: [15],
                        width: 92,
                        height: 92,
                        backgroundColor: "white"
                    });
                    document.body.appendChild(cad.dom);
                    cad.data.transform({scale: [1, -1]}, true);
                    cad.render().center();
                    card.cadImg = this.sanitizer.bypassSecurityTrustUrl(cad.toBase64());
                    cad.destroy();
                }
                done++;
                this.loadingText = `${done} / ${total}`;
            }
            await timeout(0);
        }
        this.loader.stopLoader(this.loaderId);
        this.loadingText = "";
    }

    ngOnDestroy() {
        document.body.style.overflowX = "";
        document.body.style.overflowY = "";
    }

    printPages() {
        this.printing = true;
        this.cd.detectChanges();
        print();
        this.printing = false;
    }

    getTop(i: number) {
        switch (Math.floor(i / 4)) {
            case 0:
                return "10px";
            case 1:
                return "9px";
            case 2:
                return "10px";
            case 3:
                return "11px";
            case 4:
                return "11px";
            case 5:
                return "11px";
            case 6:
                return "11px";
            default:
                return "0px";
        }
    }

    getLeft(i: number) {
        return (i % 4 ? 10 : 0) + "px";
    }
}
