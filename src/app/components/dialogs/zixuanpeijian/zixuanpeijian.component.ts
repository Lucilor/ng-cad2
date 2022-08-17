import {Component, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChildren} from "@angular/core";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute, Router} from "@angular/router";
import {CadCollection, imgCadEmpty} from "@app/app.common";
import {getCadPreview, getCadTotalLength} from "@app/cad.utils";
import {CadData, CadLine, CadMtext, CadViewer, CadZhankai, setLinesLength} from "@cad-viewer";
import {BancaiList, CadDataService, CalcResult} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {ObjectOf, timeout} from "@utils";
import {debounce} from "lodash";
import md5 from "md5";
import {openBancaiListDialog} from "../bancai-list/bancai-list.component";
import {getOpenDialogFunc} from "../dialog.common";
import {openKlkwpzDialog} from "../klkwpz-dialog/klkwpz-dialog.component";

@Component({
    selector: "app-zixuanpeijian",
    templateUrl: "./zixuanpeijian.component.html",
    styleUrls: ["./zixuanpeijian.component.scss"]
})
export class ZixuanpeijianComponent implements OnInit, OnDestroy {
    cads: ObjectOf<ZixuanpeijianItem[]> = {};
    cadsFilterInput = "";
    selectedCads: ZixuanpeijianSelectedCad[] = [];
    bancaiList: BancaiList[] = [];
    cadType = "";
    cadTypes: string[] = [];
    spinnerId = "zixuanpeijian";
    private _calcZhankaiCache: ObjectOf<CalcResult> = {};
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
        private dialog: MatDialog,
        private spinner: SpinnerService,
        private route: ActivatedRoute,
        private router: Router
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

    ngOnDestroy() {
        window.removeEventListener("resize", this.onWindowResize);
    }

    submit() {
        const result: CadData[] = [];
        this.selectedCads.forEach(({data, info}) => {
            data.info.自选配件 = info;
            info.zhankai.forEach((zhankai, i) => {
                if (data.zhankai[i]) {
                    data.zhankai[i].zhankaikuan = zhankai.width;
                    data.zhankai[i].zhankaigao = zhankai.height;
                    data.zhankai[i].shuliang = zhankai.num;
                } else {
                    data.zhankai[i] = new CadZhankai({zhankaikuan: zhankai.width, zhankaigao: zhankai.height, shuliang: zhankai.num});
                }
            });
            result.push(data);
        });
        this.dialogRef.close(result);
    }

    cancle() {
        this.dialogRef.close();
    }

    async addSelectedCad(data: CadData) {
        const data2 = data.clone(true);
        data2.entities.mtext = data2.entities.mtext.filter((e) => !e.info.isZhankaiText);
        const viewer = new CadViewer(data2, {
            enableZoom: false,
            dragAxis: "",
            entityDraggable: ["MTEXT"],
            selectMode: "single",
            backgroundColor: "black"
        });
        await viewer.render();
        let info: ZixuanpeijianInfo | undefined = data.info.自选配件;
        if (!info) {
            info = {houtaiId: data.id, zhankai: []};
            if (data.zhankai.length > 0) {
                info.zhankai = data.zhankai.map((v) => ({
                    width: v.zhankaikuan,
                    height: v.zhankaigao,
                    num: v.shuliang,
                    origin: {width: v.zhankaikuan}
                }));
            } else {
                info.zhankai = [this._getDefaultZhankai()];
            }
        }
        const item: ZixuanpeijianSelectedCad = {data: data2, viewer, info, spinnerId: `zixuanpeijian-${data2.id}`};
        const length = this.selectedCads.push(item);

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
                this.calcZhankai(item);
            }
        });

        await this.calcZhankai(item);
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
        return {width: "", height: "", num: "", origin: {width: ""}};
    }

    addZhankai(i: number, j: number) {
        this.selectedCads[i].info.zhankai.splice(j + 1, 0, this._getDefaultZhankai());
    }

    removeZhankai(i: number, j: number) {
        this.selectedCads[i].info.zhankai.splice(j, 1);
    }

    async calcZhankai(item: ZixuanpeijianSelectedCad) {
        const {data, info} = item;
        const {zhankai} = info;
        if (zhankai.length < 1 || !zhankai[0].origin.width) {
            return;
        }
        const vars = {总长: getCadTotalLength(data)};
        const formulas: ObjectOf<string> = {展开宽: zhankai[0].origin.width};
        const id = info.houtaiId;
        let result: CalcResult;
        const cacheKey = md5(JSON.stringify([id, formulas, vars]));
        if (cacheKey in this._calcZhankaiCache) {
            result = this._calcZhankaiCache[cacheKey];
        } else {
            this.spinner.show(item.spinnerId);
            result = await this.dataService.calcFormulas(formulas, vars);
            this.spinner.hide(item.spinnerId);
            this._calcZhankaiCache[cacheKey] = result;
        }
        if (result.展开宽 && !result.展开宽.error) {
            const value = result.展开宽.value;
            if (typeof value === "number" && !isNaN(value)) {
                zhankai[0].width = value.toString();
            }
        }
        info.zhankai = zhankai;
    }

    setCadType(type?: string) {
        if (type) {
            this.cadType = type;
        } else {
            type = this.cadType;
        }
        const cads = this.cads[type];
        if (cads) {
            cads.forEach(async (cad) => {
                if (cad.img === imgCadEmpty) {
                    cad.img = await getCadPreview("cad", cad.data, {http: this.dataService});
                }
            });
        }
    }

    openKlkwpzDialog(data: CadData) {
        openKlkwpzDialog(this.dialog, {data: {data}});
    }

    openCad(cad: ZixuanpeijianSelectedCad) {
        const {project} = this.route.snapshot.queryParams;
        const id = cad.info.houtaiId;
        const collection: CadCollection = "zixuanpeijian";
        const url = this.router.createUrlTree(["/index"], {queryParams: {project, id, collection}}).toString();
        open(url);
    }

    async refreshSelectedCads(cad: ZixuanpeijianSelectedCad) {
        this.spinner.show(this.spinnerId);
        const id = cad.info.houtaiId;
        const item = this.cads[this.cadType]?.find((v) => v.data.id === id);
        if (!item) {
            this.message.alert("当前cad已不存在");
            return;
        }
        item.img = await getCadPreview("cad", item.data, {http: this.dataService, useCache: false});
        for (const cad2 of this.selectedCads) {
            if (cad2.info.houtaiId === id) {
                cad.viewer.data = item.data.clone(true);
                await cad.viewer.reset().render();
                cad.viewer.center();
                await this.calcZhankai(cad);
            }
        }
        this.spinner.hide(this.spinnerId);
    }
}

export const openZixuanpeijianDialog = getOpenDialogFunc<ZixuanpeijianComponent, ZixuanpeijianData, CadData[]>(ZixuanpeijianComponent);

export interface ZixuanpeijianData {
    code: string;
    type: string;
    selectedData?: CadData[];
    sourceData?: CadData[];
}

export interface ZixuanpeijianInfo {
    houtaiId: string;
    zhankai: {width: string; height: string; num: string; origin: {width: string}}[];
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

export interface ZixuanpeijianSelectedCad {
    data: CadData;
    viewer: CadViewer;
    info: ZixuanpeijianInfo;
    spinnerId: string;
}
