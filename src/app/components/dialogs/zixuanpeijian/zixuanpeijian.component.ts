import {AfterViewChecked, Component, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChildren} from "@angular/core";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {SafeUrl} from "@angular/platform-browser";
import {imgCadEmpty} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData, CadLine, CadMtext, CadViewer, setLinesLength} from "@cad-viewer";
import {BancaiList, CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf, timeout} from "@utils";
import {debounce} from "lodash";
import {openBancaiListDialog} from "../bancai-list/bancai-list.component";
import {getOpenDialogFunc} from "../dialog.common";

export interface ZixuanpeijianData {
    code: string;
    type: string;
    selectedData?: CadData[];
    sourceData?: CadData[];
}

export interface ZixuanpeijianInfo {
    houtaiId: string;
    zhankai: {width: string; height: string; num: string}[];
    bancai?: BancaiList & {cailiao?: string; houdu?: string};
}

export interface Bancai extends BancaiList {
    cailiao?: string;
    houdu?: string;
}

export interface ZixuanpeijianItem {
    data: CadData;
    img: SafeUrl;
    hidden: boolean;
}

@Component({
    selector: "app-zixuanpeijian",
    templateUrl: "./zixuanpeijian.component.html",
    styleUrls: ["./zixuanpeijian.component.scss"]
})
export class ZixuanpeijianComponent implements OnInit, OnDestroy, AfterViewChecked {
    cads: ObjectOf<ZixuanpeijianItem[]> = {};
    cadsNeedUpdate = false;
    cadsFilterInput = "";
    selectedCads: {data: CadData; viewer: CadViewer; info: ZixuanpeijianInfo}[] = [];
    bancaiList: BancaiList[] = [];
    cadType = "";
    cadTypes: string[] = [];
    @ViewChildren("selectedCadViewer") selectedCadViewers?: QueryList<ElementRef<HTMLDivElement>>;

    filterCads = debounce(() => {
        const filterInput = this.cadsFilterInput.toLowerCase();
        this.cads[this.cadType].forEach((cad) => {
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
        private message: MessageService,
        private dialog: MatDialog
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
            const response = await this.dataService.get<{cads: any[]; bancais: BancaiList[]}>("ngcad/getZixuanpeijian");
            if (response?.data) {
                response.data.cads.forEach((v) => cads.push(new CadData(v)));
                this.bancaiList = response.data.bancais;
            }
        }
        const ids: string[] = [];
        this.cads = {};
        this.cadTypes = [];
        cads.forEach((data) => {
            const cadType = data.type;
            if (!cadType) {
                return;
            }
            if (!this.cads[cadType]) {
                this.cads[cadType] = [];
                this.cadTypes.push(cadType);
            }
            ids.push(data.id);
            const item: ZixuanpeijianItem = {data, img: imgCadEmpty, hidden: false};
            this.cads[cadType].push(item);
        });
        this.cadsNeedUpdate = true;
        if (selectedData) {
            selectedData.forEach((data) => {
                const info = data.info.自选配件 as ZixuanpeijianInfo | undefined;
                if (info && ids.includes(info.houtaiId)) {
                    this.addSelectedCad(data);
                }
            });
        }
        window.addEventListener("resize", this.onWindowResize);
    }

    async ngAfterViewChecked() {
        if (this.cadsNeedUpdate) {
            this.cadsNeedUpdate = false;
            await timeout(0);
            for (const cadType in this.cads) {
                this.cads[cadType].forEach(async (cad) => {
                    cad.img = await getCadPreview("cad", cad.data, {http: this.dataService});
                });
            }
        }
    }

    ngOnDestroy() {
        window.removeEventListener("resize", this.onWindowResize);
    }

    submit() {
        const result: CadData[] = [];
        this.selectedCads.forEach(({data, info}) => {
            data.info.自选配件 = info;
            result.push(data);
        });
        this.dialogRef.close(result);
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
        let info: ZixuanpeijianInfo | undefined = data.info.自选配件;
        if (!info) {
            info = {houtaiId: data.id, zhankai: [{width: "", height: "", num: ""}]};
        }
        const length = this.selectedCads.push({data: data2, viewer, info});
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

    async openBancaiListDialog(i: number) {
        const info = this.selectedCads[i].info;
        const bancai = info.bancai;
        const checkedItems: string[] = [];
        if (bancai) {
            checkedItems.push(bancai.mingzi);
        }
        const bancaiList = await openBancaiListDialog(this.dialog, {data: {list: this.bancaiList, selectMode: "single", checkedItems}});
        if (!bancaiList) {
            return;
        }
        if (bancai) {
            info.bancai = {...bancai, ...bancaiList[0]};
            const {cailiaoList, cailiao, houduList, houdu} = info.bancai;
            if (cailiao && !cailiaoList.includes(cailiao)) {
                delete info.bancai.cailiao;
            }
            if (houdu && !houduList.includes(houdu)) {
                delete info.bancai.houdu;
            }
        } else {
            info.bancai = bancaiList[0];
        }
    }

    private _getDefaultZhankai(): ZixuanpeijianInfo["zhankai"][0] {
        return {width: "", height: "", num: ""};
    }

    addZhankai(i: number, j: number) {
        this.selectedCads[i].info.zhankai.splice(j + 1, 0, this._getDefaultZhankai());
    }

    removeZhankai(i: number, j: number) {
        this.selectedCads[i].info.zhankai.splice(j, 1);
    }
}

export const openZixuanpeijianDialog = getOpenDialogFunc<ZixuanpeijianComponent, ZixuanpeijianData, CadData[]>(ZixuanpeijianComponent);
