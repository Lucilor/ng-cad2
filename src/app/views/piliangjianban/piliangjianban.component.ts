import {Component, OnDestroy, OnInit} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgLoading} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData, CadViewerConfig} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {AppStatusService} from "@services/app-status.service";
import {timeout} from "@utils";
import {cloneDeep} from "lodash";

export interface Bancai {
    data: {
        cad: CadData;
        unfolded: CadData;
        num: number;
        code: string;
        img: SafeUrl;
        imgLarge?: SafeUrl;
        zhankaiSize: number[];
    }[];
    id: string;
    厚度: string;
    数量: number;
    材料: string;
    板材: string;
    气体: string;
    规格: number[];
    expanded: boolean;
    pageNum: number;
    pageBreakAfter: CSSStyleDeclaration["pageBreakAfter"];
    printPageIndex: number;
}

@Component({
    selector: "app-piliangjianban",
    templateUrl: "./piliangjianban.component.html",
    styleUrls: ["./piliangjianban.component.scss"]
})
export class PiliangjianbanComponent implements OnInit, OnDestroy {
    bancais: Bancai[] = [];
    cadsRowNum = 4;
    cadsColNum = 3;
    get cadElWidth() {
        return `calc(${100 / this.cadsColNum}% - 10px)`;
    }
    imgSize = [300, 250];
    fixedLengthTextSize = 20;
    printPageTotal = 0;

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private status: AppStatusService,
        private sanitizer: DomSanitizer
    ) {}

    private _beforePrint = (() => {
        this.bancais.forEach((bancai) => (bancai.expanded = true));
    }).bind(this);

    ngOnInit() {
        setTimeout(() => this.getBancais(), 0);
        window.addEventListener("beforeprint", this._beforePrint);
    }

    ngOnDestroy() {
        window.removeEventListener("beforeprint", this._beforePrint);
    }

    async getBancais(bancais?: Bancai[]) {
        if (bancais) {
            this.bancais = bancais;
            return;
        }
        const url = "order/order/piliangjianban";
        const params = this.route.snapshot.queryParams;
        this.status.startLoader({text: "获取数据..."});
        const response = await this.dataService.post<Bancai[]>(url, params);
        if (response?.data) {
            this.status.loaderText$.next("生成预览图...");
            this.bancais.length = 0;
            response.data.forEach((bancai) => {
                const data: Bancai["data"] = [];
                bancai.data.forEach((v) => {
                    v.cad = new CadData(v.cad);
                    if (v.cad.entities.length < 1) {
                        return;
                    }
                    v.unfolded = new CadData(v.unfolded);
                    v.img = imgLoading;
                    const rect = v.unfolded.getBoundingRect();
                    v.zhankaiSize = [Number(rect.width.toFixed(1)), Number(rect.height.toFixed(1))];
                    v.cad.entities.line.forEach((line) => {
                        if (line.length <= 5) {
                            line.children.mtext = [];
                        }
                    });
                    data.push(v);
                });
                if (data.length) {
                    bancai.data = data;
                    bancai.expanded = true;
                    bancai.pageBreakAfter = "always";
                    bancai.printPageIndex = -1;
                    this.bancais.push(bancai);
                }
            });
            this.splitBancais();
            await timeout(0);
            const dataAll = this.bancais.map((v) => v.data).flat();
            const {imgSize, fixedLengthTextSize} = this;
            const config: Partial<CadViewerConfig> = {
                hideLineLength: false,
                hideLineGongshi: true,
                width: imgSize[0],
                height: imgSize[1],
                backgroundColor: "white",
                fontFamily: "宋体"
            };
            const getImg = async (data: CadData) =>
                this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(data, config, {fixedLengthTextSize}));
            await Promise.all(dataAll.map(async (v) => (v.img = await getImg(v.cad))));
            this.status.stopLoader();
            await timeout(0);
            config.width = innerWidth * 0.85;
            config.height = innerHeight * 0.85;
            await Promise.all(dataAll.map(async (v) => (v.imgLarge = await getImg(v.cad))));
        } else {
            this.status.stopLoader();
        }
    }

    splitBancais() {
        const bancais = this.bancais.slice();
        bancais.sort((a, b) => b.data.length - a.data.length);
        this.bancais = [];
        const {cadsColNum, cadsRowNum} = this;
        const cadsPerPage = cadsColNum * cadsRowNum;
        bancais.forEach((bancai) => {
            const data = bancai.data;
            bancai.data = [];
            let j = 0;
            for (let i = 0; i < data.length; i += cadsPerPage) {
                const bancaiCopy = cloneDeep(bancai);
                bancaiCopy.data = data.slice(i, i + cadsPerPage);
                bancaiCopy.pageNum = ++j;
                this.bancais.push(bancaiCopy);
            }
        });
        let printPageIndex = 1;
        for (let i = 0; i < this.bancais.length; i++) {
            const curr = this.bancais[i];
            curr.printPageIndex = printPageIndex;
            if (i < bancais.length - 1) {
                const next = this.bancais[i + 1];
                const currRows = Math.ceil(curr.data.length / cadsColNum);
                const nextRows = Math.ceil(next.data.length / cadsColNum);
                if (currRows + nextRows + 1 <= cadsRowNum) {
                    curr.pageBreakAfter = "none";
                    next.printPageIndex = printPageIndex;
                    i++;
                }
            }
            printPageIndex++;
        }
        this.printPageTotal = printPageIndex - 1;
    }

    print() {
        window.print();
    }
}
