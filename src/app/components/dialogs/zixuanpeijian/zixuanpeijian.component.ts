import {Component, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChildren} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {SafeUrl} from "@angular/platform-browser";
import {imgEmpty} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData, CadLine, CadMtext, CadViewer, setLinesLength} from "@cad-viewer";
import {BancaiList, CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {timeout} from "@utils";
import {debounce} from "lodash";
import {getOpenDialogFunc} from "../dialog.common";

export interface ZixuanpeijianData {
    code: string;
    type: string;
    selectedData?: CadData[];
    sourceData?: CadData[];
}

@Component({
    selector: "app-zixuanpeijian",
    templateUrl: "./zixuanpeijian.component.html",
    styleUrls: ["./zixuanpeijian.component.scss"]
})
export class ZixuanpeijianComponent implements OnInit, OnDestroy {
    cads: {data: CadData; img: SafeUrl; hidden: boolean}[] = [];
    cadsFilterInput = "";
    selectedCads: {data: CadData; viewer: CadViewer}[] = [];
    @ViewChildren("selectedCadViewer") selectedCadViewers?: QueryList<ElementRef<HTMLDivElement>>;

    filterCads = debounce(() => {
        const filterInput = this.cadsFilterInput.toLowerCase();
        this.cads.forEach((cad) => {
            cad.hidden = !cad.data.name.toLowerCase().includes(filterInput);
        });
    }, 500);

    onWindowResize = debounce(() => {
        this.resizeCadViewers();
    }, 500).bind(this);

    constructor(
        public dialogRef: MatDialogRef<ZixuanpeijianComponent, CadData[]>,
        @Inject(MAT_DIALOG_DATA) public data: ZixuanpeijianData | null,
        private dataService: CadDataService,
        private message: MessageService
    ) {}

    async ngOnInit() {
        await timeout(0);
        this.cadsFilterInput = "";
        const {code, type, selectedData, sourceData} = this.data || {};
        if (!code || !type) {
            throw new Error("缺少参数");
        }
        const cads = (sourceData || []).slice();
        if (cads.length < 1) {
            const response = await this.dataService.post<{cads: any[]; bancais: BancaiList[]}>("ngcad/getZixuanpeijian", {code, type});
            if (response?.data) {
                response.data.cads.forEach((v) => cads.push(new CadData(v)));
                console.log(response.data.bancais);
            }
        }
        const ids: string[] = [];
        this.cads = cads.map((data) => {
            const item: ZixuanpeijianComponent["cads"][0] = {data, img: imgEmpty, hidden: false};
            ids.push(data.id);
            (async () => {
                item.img = await getCadPreview("cad", data, {http: this.dataService});
            })();
            return item;
        });
        if (selectedData) {
            selectedData.forEach((data) => {
                if (ids.includes(data.id)) {
                    this.addSelectedCad(data);
                }
            });
        }
        window.addEventListener("resize", this.onWindowResize);
    }

    ngOnDestroy() {
        window.removeEventListener("resize", this.onWindowResize);
    }

    submit() {
        this.dialogRef.close(this.selectedCads.map((cad) => cad.data));
    }

    cancle() {
        this.dialogRef.close();
    }

    async addSelectedCad(data: CadData) {
        const data2 = data.clone(true);
        const viewer = new CadViewer(data2, {
            enableZoom: false,
            dragAxis: "",
            entityDraggable: ["MTEXT"],
            selectMode: "single",
            backgroundColor: "black"
        });
        await viewer.render();
        viewer.on("entitydblclick", async (_, entity) => {
            if (!(entity instanceof CadMtext)) {
                return;
            }
            const parent = entity.parent;
            if (!entity.info.isLengthText || !(parent instanceof CadLine)) {
                return;
            }
            const lineLengthText = await this.message.prompt({title: "修改线长", promptData: {value: entity.text, type: "number"}});
            if (lineLengthText) {
                const lineLength = Number(lineLengthText);
                if (isNaN(lineLength) || lineLength <= 0) {
                    return;
                }
                setLinesLength(data2, [parent], lineLength);
                await viewer.render();
                viewer.center();
            }
        });
        const length = this.selectedCads.push({data: data2, viewer});
        await timeout(0);
        const el = this.selectedCadViewers?.get(length - 1)?.nativeElement;
        if (el) {
            viewer.appendTo(el);
            this.resizeCadViewers(length - 1);
        }
    }

    removeSelectedCad(i: number) {
        const {viewer} = this.selectedCads[i];
        viewer.destroy();
        this.selectedCads.splice(i, 1);
    }

    resizeCadViewers(index?: number) {
        this.selectedCads.forEach((cad, i) => {
            if (typeof index === "number" && i !== index) {
                return;
            }
            const viewer = cad.viewer;
            const el = viewer.dom.parentElement;
            if (!el) {
                return;
            }
            const {width} = el.getBoundingClientRect();
            viewer.resize(width, width / 2);
            viewer.center();
        });
    }
}

export const openZixuanpeijianDialog = getOpenDialogFunc<ZixuanpeijianComponent, ZixuanpeijianData, CadData[]>(ZixuanpeijianComponent);
