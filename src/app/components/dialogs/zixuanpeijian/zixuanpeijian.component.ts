import {Component, ElementRef, Inject, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute, Router} from "@angular/router";
import {CadCollection, imgCadEmpty} from "@app/app.common";
import {getCadPreview, getCadTotalLength} from "@app/cad.utils";
import {CadData, CadLine, CadLineLike, CadMtext, CadViewer, CadZhankai, setLinesLength} from "@cad-viewer";
import {ContextMenu} from "@mixins/context-menu.mixin";
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
export class ZixuanpeijianComponent extends ContextMenu() implements OnInit, OnDestroy {
    cads: ObjectOf<ZixuanpeijianItem[]> = {};
    cadsFilterInput = "";
    selectedCads: ZixuanpeijianSelectedCad[] = [];
    bancaiList: BancaiList[] = [];
    cadType = "";
    cadTypes: string[] = [];
    spinnerId = "zixuanpeijian";
    private _calcZhankaiCache: ObjectOf<CalcResult> = {};
    @ViewChildren("selectedCadViewer") selectedCadViewers?: QueryList<ElementRef<HTMLDivElement>>;
    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
    contextMenuData = {index: -1};
    showKongCads = false;
    kongCads: ZixuanpeijianItem[] = [];

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
    ) {
        super();
    }

    async ngOnInit() {
        await timeout(0);
        this.cadsFilterInput = "";
        const {selectedData, sourceData} = this.data || {};
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
        if (this.cadTypes.length > 0) {
            this.setCadType(this.cadTypes[0]);
        }
        if (selectedData) {
            selectedData.forEach((data) => {
                const info = data.info.自选配件 as ZixuanpeijianInfo | undefined;
                if (info && ids.includes(info.houtaiId)) {
                    this.addSelectedCad(data);
                }
            });
        }
        const kongCads = await this.dataService.getCad({collection: "cad", search: {分类: "孔"}});
        this.kongCads = kongCads.cads.map((data) => ({data, img: imgCadEmpty, hidden: false}));
        window.addEventListener("resize", this.onWindowResize);
    }

    ngOnDestroy() {
        window.removeEventListener("resize", this.onWindowResize);
    }

    submit() {
        const result: CadData[] = [];
        const errors = new Set<string>();
        for (const {data, info} of this.selectedCads) {
            data.info.自选配件 = info;
            const bancai = info.bancai;
            if (!bancai || !bancai.cailiao || !bancai.houdu) {
                errors.add("板材没有填写完整");
            }
            for (const [i, {width, height, num}] of info.zhankai.entries()) {
                if (!width || !height || !num) {
                    errors.add("展开没有填写完整");
                    break;
                }
                if (data.zhankai[i]) {
                    data.zhankai[i].zhankaikuan = width;
                    data.zhankai[i].zhankaigao = height;
                    data.zhankai[i].shuliang = num;
                } else {
                    data.zhankai[i] = new CadZhankai({zhankaikuan: width, zhankaigao: height, shuliang: num});
                }
            }
            result.push(data);
        }
        if (errors.size > 0) {
            this.message.alert({content: new Error(Array.from(errors).join("<br>"))});
        } else {
            this.dialogRef.close(result);
        }
    }

    cancle() {
        this.dialogRef.close();
    }

    private _configSelectedCad(data: CadData) {
        data.entities.dimension.forEach((e) => {
            if (e.mingzi.includes("活动标注")) {
                e.mingzi = "<>";
            }
        });
    }

    async addSelectedCad(data: CadData) {
        this._configSelectedCad(data);
        const data2 = data.clone(true);
        data2.entities.mtext = data2.entities.mtext.filter((e) => !e.info.isZhankaiText);
        const viewer = new CadViewer(data2, {
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
                    // height: v.zhankaigao,
                    height: "",
                    num: v.shuliang,
                    origin: {width: v.zhankaikuan}
                }));
            } else {
                info.zhankai = [this._getDefaultZhankai()];
            }
        }
        const item: ZixuanpeijianSelectedCad = {
            data: data2,
            viewer,
            info,
            spinnerId: `zixuanpeijian-${data2.id}`,
            type: this.cadType
        };
        const length = this.selectedCads.push(item);

        viewer.on("entitydblclick", async (_, entity) => {
            if (entity instanceof CadMtext) {
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
            } else if (entity instanceof CadLineLike) {
                const name = await this.message.prompt({title: "修改线名字", promptData: {value: entity.mingzi, type: "string"}});
                if (name) {
                    entity.mingzi = name;
                    await viewer.render();
                }
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
            this.showKongCads = false;
            cads.forEach(async (cad) => {
                if (cad.img === imgCadEmpty) {
                    cad.img = await getCadPreview("cad", cad.data, {http: this.dataService});
                }
            });
        }
    }

    async openKlkwpzDialog(data: CadData) {
        const result = await openKlkwpzDialog(this.dialog, {data: {source: data.info.开料孔位配置}});
        if (result) {
            data.info.开料孔位配置 = result;
        }
    }

    openCad(cad: CadData) {
        const {project} = this.route.snapshot.queryParams;
        const id = cad.id;
        const collection: CadCollection = "zixuanpeijian";
        const url = this.router.createUrlTree(["/index"], {queryParams: {project, id, collection}}).toString();
        open(url);
    }

    async refreshSelectedCads(cad: ZixuanpeijianSelectedCad) {
        this.spinner.show(this.spinnerId);
        const id = cad.info.houtaiId;
        const item = this.cads[cad.type]?.find((v) => v.data.id === id);
        const cads = (await this.dataService.getCad({collection: "zixuanpeijian", id})).cads;
        if (!item || cads.length < 1) {
            this.message.alert("当前cad已不存在");
        } else {
            item.data = cads[0];
            item.img = await getCadPreview("cad", item.data, {http: this.dataService, useCache: false});
            for (const cad2 of this.selectedCads) {
                if (cad2.info.houtaiId === id) {
                    const data = item.data.clone(true);
                    this._configSelectedCad(data);
                    cad.viewer.data = data;
                    await cad.viewer.reset().render();
                    cad.viewer.center();
                    await this.calcZhankai(cad);
                }
            }
        }
        this.spinner.hide(this.spinnerId);
    }

    onContextMenu(event: MouseEvent, i: number): void {
        super.onContextMenu(event);
        this.contextMenuData.index = i;
    }

    centerCad() {
        const cad = this.selectedCads[this.contextMenuData.index];
        if (!cad) {
            return;
        }
        cad.viewer.center();
    }

    toggleShowKongCads(){
        this.showKongCads = !this.showKongCads;
        if (this.showKongCads) {
            this.cadType = "";
            this.kongCads.forEach(async (cad) => {
                if (cad.img === imgCadEmpty) {
                    cad.img = await getCadPreview("cad", cad.data, {http: this.dataService});
                }
            });
        }
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
    type: string;
}
