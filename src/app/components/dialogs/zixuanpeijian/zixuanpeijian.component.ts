import {CdkDragDrop, moveItemInArray} from "@angular/cdk/drag-drop";
import {Component, OnInit, OnDestroy, ViewChild, Inject, ElementRef} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {SafeUrl, DomSanitizer} from "@angular/platform-browser";
import {Router} from "@angular/router";
import {CadData, CadLine, CadLineLike, CadMtext, CadViewer, CadViewerConfig, CadZhankai, setLinesLength} from "@cad-viewer";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {CadCollection, imgCadEmpty, setGlobal} from "@src/app/app.common";
import {
    getCadPreview,
    getCadTotalLength,
    getShuangxiangLineRects,
    setDimensionText,
    setShuangxiangLineRects,
    splitShuangxiangCad
} from "@src/app/cad.utils";
import {getCADBeishu} from "@src/app/utils/beishu";
import {Formulas} from "@src/app/utils/calc";
import {toFixed} from "@src/app/utils/func";
import {matchOrderData} from "@src/app/utils/mongo";
import {nameEquals} from "@src/app/utils/zhankai";
import {ObjectOf, timeout} from "@utils";
import {cloneDeep, debounce, intersection, isEmpty, isEqual, uniq, uniqueId} from "lodash";
import {BehaviorSubject} from "rxjs";
import {openBancaiListDialog} from "../bancai-list/bancai-list.component";
import {openCadEditorDialog} from "../cad-editor-dialog/cad-editor-dialog.component";
import {getOpenDialogFunc} from "../dialog.common";
import {openKlcsDialog} from "../klcs-dialog/klcs-dialog.component";
import {openKlkwpzDialog} from "../klkwpz-dialog/klkwpz-dialog.component";
import {
    CadItemContext,
    CadItemInputInfo,
    importZixuanpeijian,
    MokuaiInputInfos,
    Step1Data,
    ZixuanpeijianCadItem,
    ZixuanpeijianInfo,
    ZixuanpeijianInput,
    ZixuanpeijianlingsanCadItem,
    ZixuanpeijianMokuaiItem,
    ZixuanpeijianOutput,
    ZixuanpeijianTypesInfo2,
    ZixuanpeijianTypesInfoItem
} from "./zixuanpeijian.types";

@Component({
    selector: "app-zixuanpeijian",
    templateUrl: "./zixuanpeijian.component.html",
    styleUrls: ["./zixuanpeijian.component.scss"]
})
export class ZixuanpeijianComponent extends ContextMenu() implements OnInit, OnDestroy {
    spinnerId = "zixuanpeijian-" + uniqueId();
    step$ = new BehaviorSubject<{value: number; refresh: boolean}>({value: 0, refresh: false});
    type1 = "";
    type2 = "";
    urlPrefix = "";
    typesInfo: ZixuanpeijianTypesInfo2 = {};
    options: ObjectOf<string[]> = {};
    bancaiList: BancaiList[] = [];
    result: ZixuanpeijianOutput = importZixuanpeijian();
    cadViewers: {模块: ObjectOf<ObjectOf<CadViewer[]>>; 零散: CadViewer[]} = {模块: {}, 零散: []};
    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
    contextMenuData = {i: -1, j: -1};
    fractionDigits = 1;
    _step1Fetched = false;
    _step2Fetched = false;
    _step3Fetched = false;
    cadItemType!: CadItemContext;

    mokuaiInputInfos: MokuaiInputInfos[] = [];
    lingsanInputInfos: CadItemInputInfo[] = [];
    dropDownOptions: {label: string; value: string; customClass?: string}[] = [];
    lingsanCads: ZixuanpeijianlingsanCadItem[] = [];
    lingsanCadTypes: string[] = [];
    lingsanCadType = "";
    lingsanCadsSearchData = {str: ""};
    lingsanCadsSearchInput: InputInfo = {
        type: "string",
        label: "搜索",
        onInput: debounce(
            ((str: string) => {
                const type = this.lingsanCadType;
                str = str.toLowerCase();
                for (const item of this.lingsanCads) {
                    item.hidden = item.data.type2 !== type || (!!str && !item.data.name.toLowerCase().includes(str));
                }
            }).bind(this),
            500
        )
    };
    lingsanCadImgs: ObjectOf<SafeUrl> = {};
    lingsanCadViewers: CadViewer[] = [];
    imgCadEmpty = imgCadEmpty;
    selectAllForm = {baicai: "", cailiao: "", houdu: ""};

    onWindowResize = debounce(() => {
        this.resizeCadViewers();
    }, 500).bind(this);

    get summitBtnText() {
        if (this.data?.stepFixed) {
            return "提交";
        }
        switch (this.step$.value.value) {
            case 1:
                return "打开算料CAD";
            case 2:
                return "提交保存";
            default:
                return "提交";
        }
    }

    get materialResult() {
        return this.data?.order?.materialResult;
    }

    constructor(
        public dialogRef: MatDialogRef<ZixuanpeijianComponent, ZixuanpeijianOutput>,
        @Inject(MAT_DIALOG_DATA) public data: ZixuanpeijianInput | null,
        private dataService: CadDataService,
        private spinner: SpinnerService,
        private message: MessageService,
        private dialog: MatDialog,
        private elRef: ElementRef<HTMLElement>,
        private calc: CalcService,
        private status: AppStatusService,
        private domSanitizer: DomSanitizer,
        private router: Router
    ) {
        super();
    }

    async ngOnInit() {
        setGlobal("zxpj", this);
        await timeout(0);
        this.step$.subscribe(this._onStep.bind(this));
        let stepValue = 1;
        if (this.data) {
            const {step, data} = this.data;
            if (data) {
                this.result = cloneDeep(importZixuanpeijian(data));
            }
            if (typeof step === "number") {
                stepValue = step;
            }
        }
        this._updateInputInfos();
        this.setStep(stepValue, true);
        window.addEventListener("resize", this.onWindowResize);
    }

    ngOnDestroy() {
        window.removeEventListener("resize", this.onWindowResize);
    }

    async step1Fetch(updateInputInfos = true) {
        let step1Data: Step1Data | undefined;
        if (this.data?.step1Data) {
            step1Data = this.data.step1Data;
        } else {
            this.spinner.show(this.spinnerId);
            const {code, type} = this.data?.order || {};
            const response = await this.dataService.post<Step1Data>("ngcad/getZixuanpeijianTypesInfo", {code, type});
            this.spinner.hide(this.spinnerId);
            step1Data = response?.data;
        }
        if (step1Data) {
            this.urlPrefix = step1Data.prefix;
            this.typesInfo = step1Data.typesInfo;
            this.options = step1Data.options;
            for (const type1 in step1Data.typesInfo) {
                for (const type2 in step1Data.typesInfo[type1]) {
                    const info = step1Data.typesInfo[type1][type2];
                    for (const item of this.result.模块) {
                        if (item.type2 === type2) {
                            const {gongshishuru, xuanxiangshuru} = item;
                            Object.assign(item, info);
                            for (const v of item.gongshishuru) {
                                v[1] = gongshishuru.find((v2) => v2[0] === v[0])?.[1] || v[1];
                            }
                            for (const v of item.xuanxiangshuru) {
                                v[1] = xuanxiangshuru.find((v2) => v2[0] === v[0])?.[1] || v[1];
                            }
                        }
                    }
                }
            }
        }
        if (updateInputInfos) {
            this._updateInputInfos();
        }
        this._step1Fetched = true;
    }

    async step2Fetch(updateInputInfos = true) {
        const typesInfo: ObjectOf<ObjectOf<1>> = {};
        this.result.模块.forEach(({type1, type2}) => {
            if (!typesInfo[type1]) {
                typesInfo[type1] = {};
            }
            if (!typesInfo[type1][type2]) {
                typesInfo[type1][type2] = 1;
            }
        });
        const response = await this.dataService.post<{cads: ObjectOf<ObjectOf<any[]>>; bancais: BancaiList[]}>(
            "ngcad/getZixuanpeijianCads",
            {typesInfo},
            {testData: "zixuanpeijianCads"}
        );
        if (response?.data) {
            const allCads: ObjectOf<ObjectOf<CadData[]>> = {};
            const {cads, bancais} = response.data;
            this.bancaiList = bancais;
            for (const type1 in cads) {
                allCads[type1] = {};
                for (const type2 in cads[type1]) {
                    allCads[type1][type2] = [];
                    for (const v of cads[type1][type2]) {
                        const data = new CadData(v);
                        delete data.options.功能分类;
                        delete data.options.配件模块;
                        allCads[type1][type2].push(data);
                    }
                    allCads[type1][type2] = matchOrderData(allCads[type1][type2], this.materialResult);
                }
            }
            const cadViewers = this.cadViewers;
            for (const type1 in cadViewers.模块) {
                for (const type2 in cadViewers.模块[type1]) {
                    cadViewers.模块[type1][type2].forEach((v) => v.destroy());
                }
            }
            cadViewers.模块 = {};
            for (const v of cadViewers.零散) {
                v.destroy();
            }
            cadViewers.零散 = [];
            const initCadViewer = (data: CadData, selector: string, type: CadItemContext["type"]) => {
                const data2 = data.clone(true);
                this._configCad(data2);
                data2.entities.mtext = data2.entities.mtext.filter((e) => !e.info.isZhankaiText);

                const config: Partial<CadViewerConfig> = {
                    entityDraggable: ["MTEXT"],
                    selectMode: "single",
                    backgroundColor: "black"
                };
                if (type === "模块") {
                    config.entityDraggable = false;
                    config.selectMode = "none";
                }
                const viewer = new CadViewer(data2, config);
                if (this.data?.cadConfig) {
                    viewer.setConfig(this.data.cadConfig);
                }
                (async () => {
                    await viewer.render();
                    if (type !== "模块") {
                        viewer.on("entitydblclick", async (_, entity) => {
                            if (entity instanceof CadMtext) {
                                const parent = entity.parent;
                                if (!entity.info.isLengthText || !(parent instanceof CadLine)) {
                                    return;
                                }
                                if (parent.gongshi) {
                                    if (!(await this.message.confirm("该线已有公式，是否覆盖？"))) {
                                        return;
                                    }
                                }
                                const lineLengthText = await this.message.prompt({
                                    title: "修改线长",
                                    promptData: {value: entity.text, type: "number"}
                                });
                                if (lineLengthText) {
                                    const lineLength = Number(lineLengthText);
                                    if (isNaN(lineLength) || lineLength <= 0) {
                                        return;
                                    }
                                    setLinesLength(data2, [parent], lineLength);
                                    parent.gongshi = "";
                                    await viewer.render();
                                    viewer.center();
                                    // this.calcZhankai(cadItem);
                                    this._calc();
                                }
                            } else if (entity instanceof CadLineLike) {
                                const name = await this.message.prompt({
                                    title: "修改线名字",
                                    promptData: {value: entity.mingzi, type: "string"}
                                });
                                if (name) {
                                    entity.mingzi = name;
                                    await viewer.render();
                                }
                            }
                        });
                    }

                    await timeout(0);
                    const el = this.elRef.nativeElement.querySelector(selector);
                    if (el instanceof HTMLElement) {
                        viewer.appendTo(el);
                        // this.resizeCadViewers([i, length - 1]);
                    }
                })();
                return {data2, viewer};
            };
            for (const [i, item] of this.result.模块.entries()) {
                const {type1, type2} = item;
                const cads1 = allCads[type1]?.[type2] || [];
                const cads2: CadData[] = [];
                const infos: ObjectOf<ZixuanpeijianInfo> = {};
                for (const {info} of item.cads) {
                    const found = cads1.find((v) => v.id === info.houtaiId);
                    if (found) {
                        cads2.push(found);
                        infos[found.id] = info;
                    }
                }
                const toAdd: CadData[] = [];
                for (const cad of cads1) {
                    const found = cads2.find((v) => {
                        const info = infos[v.id];
                        return info && info.houtaiId === cad.id;
                    });
                    if (!found) {
                        toAdd.push(cad);
                    }
                }
                cads2.push(...toAdd);
                item.cads = [];

                cads2.forEach(async (data, j) => {
                    let info: ZixuanpeijianInfo | undefined = infos[data.id];
                    if (!info) {
                        info = {houtaiId: data.id, zhankai: [], calcZhankai: []};
                    }
                    const cadItem: ZixuanpeijianCadItem = {data, info};
                    item.cads.push(cadItem);
                    const {data2, viewer} = initCadViewer(data, `#cad-viewer-模块-${i}-${j}`, "模块");
                    cadItem.data = data2;

                    if (!cadViewers.模块[type1]) {
                        cadViewers.模块[type1] = {};
                    }
                    if (!cadViewers.模块[type1][type2]) {
                        cadViewers.模块[type1][type2] = [];
                    }
                    cadViewers.模块[type1][type2].push(viewer);
                });
            }
            for (const [i, item] of this.result.零散.entries()) {
                const {data2, viewer} = initCadViewer(item.data, `#cad-viewer-零散-${i}-0`, "零散");
                item.data = data2;
                cadViewers.零散.push(viewer);
            }
        }
        if (this._calc()) {
            setTimeout(async () => {
                for (const type1 in this.cadViewers.模块) {
                    for (const type2 in this.cadViewers.模块[type1]) {
                        const cadViewers = this.cadViewers.模块[type1][type2];
                        for (const cadViewer of cadViewers) {
                            await cadViewer.render();
                            await cadViewer.render(cadViewer.data.entities.dimension);
                            cadViewer.center();
                        }
                    }
                }
                for (const cadViewer of this.cadViewers.零散) {
                    await cadViewer.render();
                    await cadViewer.render(cadViewer.data.entities.dimension);
                    cadViewer.center();
                }
            }, 0);
        }
        if (updateInputInfos) {
            this._updateInputInfos();
        }
        this._step2Fetched = true;
    }

    async step3Fetch(updateInputInfos = true) {
        const response = await this.dataService.post<{cads: CadData[]}>("ngcad/getLingsanCads");
        if (response?.data) {
            this.lingsanCadImgs = {};
            this.lingsanCadTypes = [];
            this.lingsanCads = response.data.cads.map((v) => {
                const data = new CadData(v);
                const item: ZixuanpeijianlingsanCadItem = {data, img: imgCadEmpty, hidden: false};
                const type = item.data.type2;
                if (!this.lingsanCadTypes.includes(type)) {
                    this.lingsanCadTypes.push(type);
                }
                return item;
            });
            const toRemove: number[] = [];
            for (const [i, item] of this.result.零散.entries()) {
                const found = this.lingsanCads.find((v) => v.data.id === item.info.houtaiId);
                if (found) {
                    item.data = found.data.clone(true);
                } else {
                    toRemove.push(i);
                }
                getCadPreview("cad", item.data, {http: this.dataService}).then((img) => {
                    const img2 = this.domSanitizer.bypassSecurityTrustUrl(img);
                    this.lingsanCadImgs[item.info.houtaiId] = img2;
                    if (found) {
                        found.img = img2;
                    }
                });
            }
            if (toRemove.length > 0) {
                this.result.零散 = this.result.零散.filter((_, i) => !toRemove.includes(i));
            }
        }
        if (updateInputInfos) {
            this._updateInputInfos();
        }
        this._step3Fetched = true;
    }

    async allFetch() {
        this.spinner.show(this.spinnerId);
        await Promise.all([this.step1Fetch(), this.step3Fetch()]);
        await this.step2Fetch();
        this._updateInputInfos();
        await timeout(0);
        this.spinner.hide(this.spinnerId);
    }

    private _configCad(data: CadData) {
        data.entities.dimension.forEach((e) => {
            const {显示公式} = setDimensionText(e, {});
            if (显示公式 !== null) {
                e.info.显示公式 = 显示公式;
            } else if (e.mingzi === "<>") {
                e.info.显示公式 = "<>";
            } else if (isNaN(Number(e.mingzi))) {
                e.visible = false;
            }
            e.setStyle({text: {size: 36}});
        });
    }

    private _getDefaultZhankai(): ZixuanpeijianInfo["zhankai"][0] {
        return {width: "", height: "", num: "", originalWidth: ""};
    }

    async calcZhankai(item: ZixuanpeijianCadItem) {
        const {data, info} = item;
        const {zhankai} = info;
        if (zhankai.length < 1 || !zhankai[0].originalWidth || zhankai[0].custom) {
            return;
        }
        const vars = {...this.materialResult, ...this._getCadLengthVars(data)};
        const formulas: ObjectOf<string> = {展开宽: zhankai[0].originalWidth};
        const calcResult = this.calc.calcFormulas(formulas, vars);
        const {展开宽} = calcResult?.succeed || {};
        if (typeof 展开宽 === "number" && !isNaN(展开宽)) {
            zhankai[0].width = toFixed(展开宽, this.fractionDigits);
        }
        info.zhankai = zhankai;
    }

    resizeCadViewers(indexes?: [number, number]) {
        for (const [i, item] of this.result.模块.entries()) {
            const {type1, type2} = item;
            const cadViewers = this.cadViewers.模块[type1]?.[type2];
            if (cadViewers) {
                for (const [j, cadViewer] of cadViewers.entries()) {
                    if (indexes && indexes[0] !== i && indexes[1] !== j) {
                        continue;
                    }
                    const el = cadViewer.dom.parentElement;
                    if (!el) {
                        continue;
                    }
                    const {width} = el.getBoundingClientRect();
                    cadViewer.resize(width, width / 2);
                    cadViewer.center();
                }
            }
        }
    }

    async openKlkwpzDialog(item: ZixuanpeijianCadItem) {
        const result = await openKlkwpzDialog(this.dialog, {data: {source: item.info.开料孔位配置 || {}, cadId: item.info.houtaiId}});
        if (result) {
            item.info.开料孔位配置 = result;
        }
    }

    async openKlcsDialog(item: ZixuanpeijianCadItem) {
        const result = await openKlcsDialog(this.dialog, {
            data: {
                source: item.info.开料参数 || {_id: "", 名字: item.data.name + "中空参数", 分类: "切中空", 参数: []},
                cadId: item.info.houtaiId
            }
        });
        if (result) {
            item.info.开料参数 = result;
        }
    }

    onContextMenu(event: MouseEvent, i: number, j: number): void {
        super.onContextMenu(event);
        this.contextMenuData.i = i;
        this.contextMenuData.j = j;
    }

    centerCad() {
        const {i, j} = this.contextMenuData;
        const {type1, type2} = this.result.模块[i];
        const cadViewer = this.cadViewers.模块[type1]?.[type2]?.[j];
        if (cadViewer) {
            cadViewer.center();
        }
    }

    private async _onStep({value, refresh}: ZixuanpeijianComponent["step$"]["value"]) {
        if (value === 1) {
            if (refresh || !this._step1Fetched) {
                await this.step1Fetch();
            }
            if (!this.type1) {
                this.type1 = Object.keys(this.typesInfo)[0] || "";
            }
        } else if (value === 2) {
            if (refresh || !this._step2Fetched) {
                await this.step2Fetch();
            }
        } else if (value === 3) {
            if (refresh || !this._step3Fetched) {
                await this.step3Fetch();
            }
            if (!this.lingsanCadType) {
                this.setlingsanCadType(this.lingsanCadTypes[0]);
            }
        }
    }

    async submit() {
        const {value} = this.step$.value;
        const stepFixed = this.data?.stepFixed;
        if (value === 1) {
            const errors = new Set<string>();
            if (this.data?.checkEmpty) {
                for (const {totalWidth, totalHeight, gongshishuru, xuanxiangshuru, shuruzongkuan, shuruzonggao} of this.result.模块) {
                    if (!totalWidth && shuruzongkuan) {
                        errors.add("总宽不能为空");
                    }
                    if (!totalHeight && shuruzonggao) {
                        errors.add("总高不能为空");
                    }
                    if (!gongshishuru.every((v) => v.every(Boolean))) {
                        errors.add("公式输入不能为空");
                    }
                    if (!xuanxiangshuru.every((v) => v.every(Boolean))) {
                        errors.add("选项输入不能为空");
                    }
                }
            }
            if (errors.size > 0 && this.data?.checkEmpty) {
                this.message.error(Array.from(errors).join("<br>"));
            } else {
                if (stepFixed) {
                    this.dialogRef.close(this.result);
                } else {
                    this.setStep(2, true);
                }
            }
        } else if (value === 2) {
            const errors = new Set<string>();
            if (this.data?.checkEmpty) {
                for (const {cads} of this.result.模块) {
                    for (const {info} of cads) {
                        if (info.hidden) {
                            continue;
                        }
                        const bancai = info.bancai;
                        if (!bancai || !bancai.cailiao || !bancai.houdu) {
                            errors.add("板材没有填写完整");
                        }
                        for (const {width, height, num} of info.zhankai) {
                            if (!width || !height || !num) {
                                errors.add("展开没有填写完整");
                                break;
                            }
                            // if (data.zhankai[i]) {
                            //     data.zhankai[i].zhankaikuan = width;
                            //     data.zhankai[i].zhankaigao = height;
                            //     data.zhankai[i].shuliang = num;
                            // } else {
                            //     data.zhankai[i] = new CadZhankai({zhankaikuan: width, zhankaigao: height, shuliang: num});
                            // }
                        }
                    }
                }
            }
            if (errors.size > 0) {
                this.message.error(Array.from(errors).join("<br>"));
            } else {
                if (this._calc()) {
                    this.dialogRef.close(this.result);
                }
            }
        } else if (value === 3) {
            if (stepFixed) {
                this.dialogRef.close(this.result);
            } else {
                this.setStep(2, true);
            }
        }
    }

    cancel() {
        const stepFixed = this.data?.stepFixed;
        if (this.step$.value.value === 2 || stepFixed) {
            this.dialogRef.close();
        } else {
            this.setStep(2, true);
        }
    }

    setStep(value: number, refresh = false) {
        this.step$.next({value, refresh});
    }

    setTypesInfo1(type1: string) {
        this.type1 = type1;
    }

    private _updateInputInfos() {
        this.dropDownOptions.length = 0;
        const vars = this.materialResult || {};

        // const bancaiOptions: InputInfoString["options"] = this.bancaiList.map((v) => v.mingzi);
        const shuchubianliangKeys = new Set<string>();
        const fixedBancaiOptions: string[] = [];
        const bancaiMap: ObjectOf<{cailiao: string[]; houdu: string[]}> = {};
        for (const type1 in this.typesInfo) {
            for (const type2 in this.typesInfo[type1]) {
                const item = this.typesInfo[type1][type2];
                if (item.unique) {
                    const item2 = this.result.模块.find((v) => v.type1 === type1 && v.type2 === type2);
                    item.disableAdd = !!item2;
                }
            }
        }
        for (const item of this.result.模块) {
            for (const {info} of item.cads) {
                if (info.bancai) {
                    const {mingzi, cailiao, houdu} = info.bancai;
                    fixedBancaiOptions.push(mingzi);
                    if (!bancaiMap[mingzi]) {
                        bancaiMap[mingzi] = {cailiao: [], houdu: []};
                    }
                    if (cailiao && !bancaiMap[mingzi].cailiao.includes(cailiao)) {
                        bancaiMap[mingzi].cailiao.push(cailiao);
                    }
                    if (houdu && !bancaiMap[mingzi].houdu.includes(houdu)) {
                        bancaiMap[mingzi].houdu.push(houdu);
                    }
                }
            }
            for (const key of item.shuchubianliang) {
                shuchubianliangKeys.add(key);
            }
        }

        const dropDownKeys = new Set<string>(this.data?.dropDownKeys);
        for (const key of shuchubianliangKeys) {
            dropDownKeys.delete(key);
        }
        for (const key of dropDownKeys) {
            const value = Number(vars[key]);
            if (value > 0) {
                this.dropDownOptions.push({label: key, value: String(value)});
            }
        }
        for (const key of shuchubianliangKeys) {
            const value = key in vars ? String(vars[key]) : "";
            this.dropDownOptions.push({label: key, value, customClass: "shuchubianliang"});
        }
        const options = this.dropDownOptions.map((v) => v.label);

        const getCadItemInputInfos = (items: ZixuanpeijianCadItem[], type: CadItemContext["type"]) =>
            items.map<CadItemInputInfo>(({info}) => {
                const {zhankai, bancai} = info;
                let bancaiName = bancai?.mingzi || "";
                if (bancai && bancaiName === "自定义") {
                    bancaiName += `: ${bancai.zidingyi || ""}`;
                }
                const zhankaiReadOnly = type === "模块";
                return {
                    zhankai: zhankai.map<CadItemInputInfo["zhankai"][0]>((v) => ({
                        width: {
                            type: "string",
                            label: "展开宽",
                            options,
                            model: {key: "width", data: v},
                            readonly: zhankaiReadOnly,
                            showEmpty: true,
                            onChange: () => {
                                v.custom = true;
                            }
                        },
                        height: {
                            type: "string",
                            label: "展开高",
                            options,
                            model: {key: "height", data: v},
                            readonly: zhankaiReadOnly,
                            showEmpty: true,
                            onChange: () => {
                                v.custom = true;
                            }
                        },
                        num: {
                            type: "string",
                            label: "数量",
                            model: {key: "num", data: v},
                            readonly: zhankaiReadOnly,
                            showEmpty: true,
                            onChange: () => {
                                v.custom = true;
                            }
                        }
                    })),
                    板材: {
                        type: "string",
                        label: "板材",
                        value: bancaiName,
                        showEmpty: true
                    },
                    材料: {
                        type: "select",
                        label: "材料",
                        options: bancai?.cailiaoList || [],
                        model: {key: "cailiao", data: bancai},
                        showEmpty: true
                    },
                    厚度: {
                        type: "select",
                        label: "厚度",
                        options: bancai?.houduList || [],
                        model: {key: "houdu", data: bancai},
                        showEmpty: true
                    }
                };
            });

        this.mokuaiInputInfos = this.result.模块.map<MokuaiInputInfos>((item, i) => ({
            总宽: {type: "string", label: "总宽", model: {key: "totalWidth", data: item}, showEmpty: item.shuruzongkuan, options},
            总高: {type: "string", label: "总高", model: {key: "totalHeight", data: item}, showEmpty: item.shuruzonggao, options},
            公式输入: item.gongshishuru.map((group) => ({
                type: "string",
                label: group[0],
                model: {key: "1", data: group},
                showEmpty: true,
                options,
                onChange: () => {
                    const gongshishuru: ObjectOf<string> = {};
                    for (const [k, v] of item.gongshishuru) {
                        gongshishuru[k] = v;
                    }
                    for (const [j, item2] of this.result.模块.entries()) {
                        if (i === j) {
                            continue;
                        }
                        for (const group2 of item2.gongshishuru) {
                            if (group2[0] in gongshishuru) {
                                group2[1] = gongshishuru[group2[0]];
                            }
                        }
                    }
                }
            })),
            选项输入: item.xuanxiangshuru.map((group) => ({
                type: "select",
                label: group[0],
                model: {key: "1", data: group},
                options: this.options[group[0]] || [],
                showEmpty: true,
                onChange: () => {
                    const xuanxiangshuru: ObjectOf<string> = {};
                    for (const [k, v] of item.xuanxiangshuru) {
                        xuanxiangshuru[k] = v;
                    }
                    for (const [j, item2] of this.result.模块.entries()) {
                        if (i === j) {
                            continue;
                        }
                        for (const group2 of item2.xuanxiangshuru) {
                            if (group2[0] in xuanxiangshuru) {
                                group2[1] = xuanxiangshuru[group2[0]];
                            }
                        }
                    }
                }
            })),
            cads: getCadItemInputInfos(item.cads, "模块")
        }));
        this.lingsanInputInfos = getCadItemInputInfos(this.result.零散, "零散");
    }

    addMokuaiItem(type1: string, type2: string) {
        const typesItem = cloneDeep(this.typesInfo[type1][type2]);
        const item: ZixuanpeijianMokuaiItem = {type1, type2, totalWidth: "", totalHeight: "", ...typesItem, cads: []};
        const gongshishuru: ObjectOf<string> = {};
        const xuanxiangshuru: ObjectOf<string> = {};
        for (const item2 of this.result.模块) {
            for (const group of item2.gongshishuru) {
                gongshishuru[group[0]] = group[1];
            }
            for (const group of item2.xuanxiangshuru) {
                xuanxiangshuru[group[0]] = group[1];
            }
        }
        for (const [i, v] of item.gongshishuru.entries()) {
            if (gongshishuru[v[0]]) {
                item.gongshishuru[i][1] = gongshishuru[v[0]];
            }
        }
        for (const [i, v] of item.xuanxiangshuru.entries()) {
            if (xuanxiangshuru[v[0]]) {
                item.xuanxiangshuru[i][1] = xuanxiangshuru[v[0]];
            }
        }
        this.result.模块.push(item);
        const formulas = typesItem.suanliaogongshi;
        const vars = this.materialResult || {};
        const result = this.calc.calcFormulas(formulas, vars, false);
        if (result) {
            const {succeedTrim} = result;
            for (const group of typesItem.gongshishuru) {
                if (succeedTrim[group[0]] > 0 && !(group[0] in gongshishuru)) {
                    group[1] = toFixed(succeedTrim[group[0]], this.fractionDigits);
                }
            }
            for (const group of typesItem.xuanxiangshuru) {
                if (group[0] in succeedTrim && !(group[0] in xuanxiangshuru)) {
                    const value = succeedTrim[group[0]];
                    if (typeof value === "number") {
                        group[1] = toFixed(value, this.fractionDigits);
                    } else {
                        group[1] = group[1] || value;
                    }
                }
            }
            if (succeedTrim.总宽 > 0) {
                item.totalWidth = toFixed(succeedTrim.总宽, this.fractionDigits);
            }
            if (succeedTrim.总高 > 0) {
                item.totalHeight = toFixed(succeedTrim.总高, this.fractionDigits);
            }
        }
        this._updateInputInfos();
    }

    removeMokuaiItem(i: number) {
        this.result.模块.splice(i, 1);
        this._updateInputInfos();
    }

    addLingsanItem(i: number) {
        const data = this.lingsanCads[i].data.clone(true);
        data.name += "M";
        this.result.零散.push({data, info: {houtaiId: this.lingsanCads[i].data.id, zhankai: [], calcZhankai: []}});
        this._updateInputInfos();
    }

    removeLingsanItem(i: number) {
        this.result.零散.splice(i, 1);
        this._updateInputInfos();
    }

    async copyLingsanCad(i: number) {
        const data = this.lingsanCads[i].data;
        const name = await this.message.prompt({
            title: "复制零散配件",
            promptData: {label: "零散配件名字", value: data.name + "_复制", validators: Validators.required}
        });
        if (!name) {
            return;
        }
        const project = this.status.project;
        const collection = "cad";
        let id = data.id;
        const response = await this.dataService.post<{id: string}>("peijian/cad/copyCad", {collection, id, data: {名字: name}});
        if (!response?.data) {
            return;
        }
        id = response.data.id;
        const src = this.router.createUrlTree(["/index"], {queryParams: {project, collection, id}}).toString();
        await this.message.iframe({content: src, title: name});
        this.step3Fetch();
    }

    openLingsanCad(i: number) {
        this.status.openCadInNewTab(this.lingsanCads[i].data.id, "cad");
    }

    getZhankaiArr(type: CadItemContext["type"], i: number, j: number) {
        return type === "模块" ? this.result.模块[i].cads[j].info.zhankai : this.result.零散[i].info.zhankai;
    }

    addZhankai(type: CadItemContext["type"], i: number, j: number, k: number) {
        const arr = this.getZhankaiArr(type, i, j);
        arr.splice(k + 1, 0, this._getDefaultZhankai());
        this._updateInputInfos();
    }

    removeZhankai(type: CadItemContext["type"], i: number, j: number, k: number) {
        const arr = this.getZhankaiArr(type, i, j);
        arr.splice(k, 1);
        this._updateInputInfos();
    }

    private _getCadLengthVars(data: CadData) {
        const getLength = (d: CadData) => Number(toFixed(getCadTotalLength(d), 4));
        const vars: Formulas = {总长: getLength(data)};
        const cads = splitShuangxiangCad(data);
        if (cads) {
            vars.双折宽 = getLength(cads[0]);
            vars.双折高 = getLength(cads[1]);
        }
        return vars;
    }

    private _calc(): boolean {
        const materialResult = this.materialResult || {};
        const shuchubianliang: Formulas = {};
        const duplicateScbl: ZixuanpeijianMokuaiItem[] = [];
        const duplicateXxsr: ObjectOf<Set<string>> = {};
        for (const [i, item1] of this.result.模块.entries()) {
            for (const [j, item2] of this.result.模块.entries()) {
                if (i === j) {
                    continue;
                }
                if (item1.type2 === item2.type2) {
                    if (item1.unique) {
                        this.message.error(`${item1.type1}-${item1.type2}只能单选`);
                        return false;
                    } else {
                        continue;
                    }
                }
                const duplicateKeys = intersection(item1.shuchubianliang, item2.shuchubianliang);
                if (duplicateKeys.length > 0) {
                    if (!duplicateScbl.find((v) => v.type2 === item1.type2)) {
                        duplicateScbl.push(item1);
                    }
                    if (!duplicateScbl.find((v) => v.type2 === item2.type2)) {
                        duplicateScbl.push(item2);
                    }
                }
            }
            for (const group of item1.xuanxiangshuru) {
                if (group[0] in materialResult && materialResult[group[0]] !== "无") {
                    const title = this.getMokuaiTitle(item1);
                    if (!duplicateXxsr[title]) {
                        duplicateXxsr[title] = new Set();
                    }
                    duplicateXxsr[title].add(group[0]);
                }
            }
            if (Object.keys(duplicateXxsr).length > 0) {
                const str =
                    "以下选项输入与订单数据冲突<br>" +
                    Object.entries(duplicateXxsr)
                        .map(([title, keys]) => `${title}: ${Array.from(keys).join(", ")}`)
                        .join("<br>");
                this.message.error(str);
                return false;
            }
        }
        if (duplicateScbl.length > 0) {
            const str =
                "输出变量重复<br>" +
                duplicateScbl
                    .map((v) => {
                        const keys = v.shuchubianliang.join(", ");
                        return `${this.getMokuaiTitle(v)}: ${keys}`;
                    })
                    .join("<br>");
            this.message.error(str);
            return false;
        }
        const toCalc1 = this.result.模块.map((item) => {
            const formulas = {...item.suanliaogongshi};
            if (item.shuruzongkuan) {
                formulas.总宽 = item.totalWidth;
            }
            if (item.shuruzonggao) {
                formulas.总高 = item.totalHeight;
            }
            for (const group of item.gongshishuru) {
                if (group[0] && group[1]) {
                    formulas[group[0]] = group[1];
                }
            }
            for (const group of item.xuanxiangshuru) {
                if (group[0] && group[1]) {
                    formulas[group[0]] = `'${group[1]}'`;
                }
            }
            const vars: Formulas = {};
            for (const cad of item.cads) {
                const data = cad.data;
                for (const e of data.entities.dimension) {
                    const name = e.mingzi;
                    if (!name || e.info.显示公式) {
                        continue;
                    }
                    const points = data.getDimensionPoints(e);
                    if (points.length < 4) {
                        continue;
                    }
                    vars[name] = points[2].distanceTo(points[3]);
                }
            }
            return {formulas, vars, succeed: {} as Formulas, error: {} as Formulas, item};
        });

        let initial = true;
        let calc1Finished = false;
        let calcErrors1: Formulas = {};
        let calcErrors2: Formulas = {};
        const indexesMap: ObjectOf<ObjectOf<number[]>> = {};
        while (!calc1Finished) {
            calc1Finished = true;
            const shuchubianliangFlag: ObjectOf<ObjectOf<true>> = {};
            const alertError = !initial && isEqual(calcErrors1, calcErrors2);
            calcErrors1 = calcErrors2;
            calcErrors2 = {};
            for (const [i, v] of toCalc1.entries()) {
                const {type1, type2} = v.item;
                if (initial) {
                    if (!indexesMap[type1]) {
                        indexesMap[type1] = {};
                    }
                    if (!indexesMap[type1][type2]) {
                        indexesMap[type1][type2] = [];
                    }
                    if (!indexesMap[type1][type2].includes(i)) {
                        indexesMap[type1][type2].push(i);
                    }
                }
                if (shuchubianliangFlag[type1]?.[type2]) {
                    continue;
                } else {
                    shuchubianliangFlag[type1] = shuchubianliangFlag[type1] || {};
                    shuchubianliangFlag[type1][type2] = true;
                }
                if (!initial && isEmpty(v.error)) {
                    continue;
                }
                const formulas1 = v.formulas;
                const vars1 = {...materialResult, ...v.vars};
                const result1 = this.calc.calcFormulas(formulas1, vars1, alertError);
                // console.log({formulas1, vars1, result1});
                if (!result1) {
                    if (alertError) {
                        return false;
                    } else {
                        continue;
                    }
                }
                const missingKeys: string[] = [];
                for (const vv of v.item.shuchubianliang) {
                    if (vv in result1.succeedTrim) {
                        shuchubianliang[vv] = result1.succeedTrim[vv];
                    } else {
                        missingKeys.push(vv);
                    }
                }
                if (missingKeys.length > 0) {
                    this.message.error(`${this.getMokuaiTitle(v.item)}缺少输出变量<br>${missingKeys.join(", ")}`);
                    return false;
                }
                // Object.assign(materialResult, result1.succeedTrim);
                v.succeed = result1.succeed;
                v.error = result1.error;
                if (!isEmpty(result1.error)) {
                    calc1Finished = false;
                    calcErrors2 = {...calcErrors2, ...result1.error};
                }
            }
            initial = false;
        }
        // console.log({toCalc1, allScbl, indexesMap});

        const calcCadItem = ({data, info}: ZixuanpeijianCadItem, vars2: Formulas) => {
            const formulas2: Formulas = {};

            const zhankais: [number, CadZhankai][] = [];
            for (const [i, zhankai] of data.zhankai.entries()) {
                let enabled = true;
                for (const condition of zhankai.conditions) {
                    if (!condition.trim()) {
                        continue;
                    }
                    const result = this.calc.calcExpression(condition, vars2);
                    if (result === null) {
                        return false;
                    }
                    if (!result) {
                        enabled = false;
                        break;
                    }
                }
                if (enabled) {
                    zhankais.push([i, zhankai]);
                }
            }
            if (zhankais.length < 1) {
                info.hidden = true;
            } else {
                info.hidden = false;
                for (const [j, e] of data.entities.line.entries()) {
                    if (e.gongshi) {
                        formulas2[`线${j + 1}公式`] = e.gongshi;
                    }
                }
                for (const e of data.entities.dimension) {
                    if (e.info.显示公式) {
                        if (e.info.显示公式 in vars2) {
                            e.mingzi = toFixed(vars2[e.info.显示公式], this.fractionDigits);
                        } else {
                            e.mingzi = e.info.显示公式;
                        }
                    }
                }
                const result2 = this.calc.calcFormulas(formulas2, vars2, true);
                // console.log({formulas2, vars2, result2});
                if (!result2) {
                    return false;
                }
                const shaungxiangCads = splitShuangxiangCad(data);
                const shaungxiangRects = getShuangxiangLineRects(shaungxiangCads);
                for (const key in result2.succeedTrim) {
                    const match = key.match(/线(\d+)公式/);
                    const value = result2.succeedTrim[key];
                    if (match) {
                        const index = Number(match[1]);
                        // if (typeof value !== "number" || !(value > 0)) {
                        //     this.message.error(`线长公式出错<br>${data.name}的第${index}根线<br>${formulas3[key]} = ${value}`);
                        //     return false;
                        // }
                        setLinesLength(data, [data.entities.line[index - 1]], Number(value));
                    }
                }
                setShuangxiangLineRects(shaungxiangCads, shaungxiangRects);
                const vars3 = {...vars2, ...this._getCadLengthVars(data)};
                const zhankais2: ZixuanpeijianInfo["zhankai"] = [];
                for (const [i, zhankai] of zhankais) {
                    const formulas3: Formulas = {};
                    formulas3.展开宽 = zhankai.zhankaikuan;
                    formulas3.展开高 = zhankai.zhankaigao;
                    formulas3.数量 = `(${zhankai.shuliang})*(${zhankai.shuliangbeishu})`;
                    const result3 = this.calc.calcFormulas(formulas3, vars3, {data});
                    if (!result3) {
                        return false;
                    }
                    const width = toFixed(result3.succeedTrim.展开宽, this.fractionDigits);
                    const height = toFixed(result3.succeedTrim.展开高, this.fractionDigits);
                    let num = Number(result3.succeedTrim.数量);
                    const {产品分类, 栋数, 门中门扇数} = materialResult;
                    const CAD分类 = data.type;
                    const CAD分类2 = data.type2;
                    num *= getCADBeishu(String(产品分类), String(栋数), CAD分类, CAD分类2, String(门中门扇数));
                    zhankais2.push({width, height, num: String(num), originalWidth: zhankai.zhankaikuan, cadZhankaiIndex: i});
                }
                info.zhankai = [...zhankais2, ...info.zhankai.filter((v) => !("cadZhankaiIndex" in v))];
                if (info.zhankai.length < 1) {
                    info.zhankai.push(this._getDefaultZhankai());
                }
                info.calcZhankai = info.zhankai.flatMap((v) => {
                    let cadZhankai: CadZhankai | undefined;
                    if (v.cadZhankaiIndex && v.cadZhankaiIndex > 0) {
                        cadZhankai = data.zhankai[v.cadZhankaiIndex];
                    }
                    if (!cadZhankai && data.zhankai.length > 0) {
                        cadZhankai = new CadZhankai(data.zhankai[0].export());
                        cadZhankai.zhankaikuan = v.width;
                        cadZhankai.zhankaigao = v.height;
                        cadZhankai.shuliang = v.num;
                    }
                    if (!cadZhankai) {
                        return {};
                    }
                    const calc: ObjectOf<any> = {
                        name: cadZhankai.name,
                        kailiao: cadZhankai.kailiao,
                        kailiaomuban: cadZhankai.kailiaomuban,
                        neikaimuban: cadZhankai.neikaimuban,
                        chai: cadZhankai.chai,
                        flip: cadZhankai.flip,
                        flipChai: cadZhankai.flipChai,
                        neibugongshi: cadZhankai.neibugongshi,
                        calcW: Number(v.width),
                        calcH: Number(v.height),
                        num: Number(v.num),
                        包边正面按分类拼接: cadZhankai.包边正面按分类拼接,
                        属于正面部分: false,
                        属于框型部分: false,
                        默认展开宽: !!nameEquals(cadZhankai.zhankaikuan, [
                            "ceil(总长)+0",
                            "ceil(总长)+0+(总使用差值)",
                            "总长+(总使用差值)",
                            "总长+0+(总使用差值)"
                        ])
                    };
                    ["门扇上切", "门扇下切", "门扇上面上切", "门扇下面下切"].forEach((qiekey) => {
                        if (cadZhankai?.zhankaigao.includes(qiekey) && materialResult[qiekey] > 0) {
                            if (qiekey.includes("上切")) {
                                calc["上切"] = materialResult[qiekey];
                            } else {
                                calc["下切"] = materialResult[qiekey];
                            }
                        }
                    });
                    if (cadZhankai.chai) {
                        calc.num = 1;
                        const calc2 = [];
                        calc2.push(calc);
                        for (let i = 1; i < calc.num; i++) {
                            const calc1 = JSON.parse(JSON.stringify(calc));
                            if (!calc1.flip) {
                                calc1.flip = [];
                            }
                            calc1.name = `${cadZhankai.name}${i}`;
                            calc2.push(calc1);
                        }
                        return calc2;
                    }
                    return calc;
                });
            }
            return true;
        };

        for (const item of this.result.模块) {
            const {type1, type2} = item;
            for (const cadItem of item.cads) {
                const vars2: Formulas = {...toCalc1[indexesMap[type1][type2][0]].succeed, ...shuchubianliang};
                if (!calcCadItem(cadItem, vars2)) {
                    return false;
                }
            }
        }
        for (const item of this.result.零散) {
            if (!calcCadItem(item, materialResult)) {
                return false;
            }
        }
        this._updateInputInfos();
        return true;
    }

    // TODO: isLocal
    async openCad(item: ZixuanpeijianCadItem, isMuban: boolean, isLocal: boolean) {
        let data: CadData | undefined;
        let collection: CadCollection | undefined;
        if (isMuban) {
            collection = "kailiaocadmuban";
            const id = this.getMubanId(item.data);
            const {cads} = await this.dataService.getCad({collection, id});
            if (cads.length > 0) {
                data = cads[0];
            } else {
                return;
            }
        } else {
            collection = "cad";
            if (isLocal) {
                data = item.data;
            } else {
                const id = item.info.houtaiId;
                const {cads} = await this.dataService.getCad({collection, id});
                if (cads.length > 0) {
                    data = cads[0];
                } else {
                    return;
                }
            }
        }
        const result = await openCadEditorDialog(this.dialog, {data: {data, collection, isLocal}});
        if (result?.isSaved) {
            await this.allFetch();
        }
    }

    showItem(item: ZixuanpeijianTypesInfoItem) {
        const xinghaoId = String(this.materialResult?.型号id || "");
        return !xinghaoId || !(item.xinghaozhuanyong?.length > 0) || item.xinghaozhuanyong.includes(xinghaoId);
    }

    returnZero() {
        return 0;
    }

    setlingsanCadType(type: string) {
        for (const item of this.lingsanCads) {
            item.hidden = item.data.type2 !== type;
            if (!item.hidden && item.img === imgCadEmpty) {
                getCadPreview("cad", item.data, {http: this.dataService}).then((img) => {
                    item.img = this.domSanitizer.bypassSecurityTrustUrl(img);
                    this.lingsanCadImgs[item.data.id] = item.img;
                });
            }
        }
        this.lingsanCadType = type;
    }

    private _setInfoBancai(info: ZixuanpeijianInfo, bancai: BancaiList) {
        if (info.bancai) {
            info.bancai = {...info.bancai, ...bancai};
            const {cailiaoList, cailiao, houduList, houdu} = info.bancai;
            if (cailiao && !cailiaoList.includes(cailiao)) {
                delete info.bancai.cailiao;
            }
            if (houdu && !houduList.includes(houdu)) {
                delete info.bancai.houdu;
            }
        } else {
            info.bancai = bancai;
        }
    }

    async openBancaiListDialog(info: ZixuanpeijianInfo) {
        const bancai = await openBancaiListDialog(this.dialog, {data: {list: this.bancaiList, checkedItem: info.bancai}});
        if (!bancai) {
            return;
        }
        this._setInfoBancai(info, bancai);
        this._updateInputInfos();
    }

    private _getCurrBancaiName() {
        const bancais = this.result.模块
            .flatMap((v) => v.cads.map((vv) => vv.info.bancai))
            .concat(this.result.零散.map((v) => v.info.bancai));
        const bancaisNotEmpty = bancais.filter((v) => v) as BancaiList[];
        if (bancaisNotEmpty.length < bancais.length) {
            return null;
        }
        const bancaiNames = uniq(bancaisNotEmpty.map((v) => v.mingzi));
        if (bancaiNames.length > 1) {
            return null;
        }
        return bancaiNames.length === 1 ? bancaiNames[0] : "";
    }

    private _getCurrBancais() {
        const bancais = this.result.模块
            .flatMap((v) => v.cads.map((vv) => vv.info.bancai))
            .concat(this.result.零散.map((v) => v.info.bancai));
        const bancaisNotEmpty = bancais.filter((v) => v) as BancaiList[];
        const names = uniq(bancaisNotEmpty.map((v) => v.mingzi));
        return this.bancaiList.filter((v) => names.includes(v.mingzi));
    }

    async selectAllBancai() {
        const bancaiName = this._getCurrBancaiName();
        const bancaiPrev = this.bancaiList.find((v) => v.mingzi === bancaiName);
        const bancai = await openBancaiListDialog(this.dialog, {
            data: {list: this.bancaiList, checkedItem: bancaiPrev}
        });
        if (!bancai) {
            return;
        }
        for (const item of this.result.模块) {
            for (const {info} of item.cads) {
                this._setInfoBancai(info, bancai);
            }
        }
        for (const {info} of this.result.零散) {
            this._setInfoBancai(info, bancai);
        }
        this._updateInputInfos();
    }

    async selectAllCailiao() {
        const bancais = this._getCurrBancais();
        const cailiaoList = uniq(bancais.flatMap((v) => v.cailiaoList));
        const result = await this.message.button({buttons: cailiaoList});
        if (result && cailiaoList.includes(result)) {
            const setItems = (items: ZixuanpeijianCadItem[]) => {
                for (const {info} of items) {
                    if (info.bancai && info.bancai.cailiaoList.includes(result)) {
                        info.bancai.cailiao = result;
                    }
                }
            };
            for (const item of this.result.模块) {
                setItems(item.cads);
            }
            setItems(this.result.零散);
        }
    }

    async selectAllHoudu() {
        const bancais = this._getCurrBancais();
        const houduList = uniq(bancais.flatMap((v) => v.houduList));
        const result = await this.message.button({buttons: houduList});
        if (result && houduList.includes(result)) {
            const setItems = (items: ZixuanpeijianCadItem[]) => {
                for (const {info} of items) {
                    if (info.bancai && info.bancai.houduList.includes(result)) {
                        info.bancai.houdu = result;
                    }
                }
            };
            for (const item of this.result.模块) {
                setItems(item.cads);
            }
            setItems(this.result.零散);
        }
    }

    dropMokuaiItem(event: CdkDragDrop<ZixuanpeijianMokuaiItem[]>) {
        moveItemInArray(this.result.模块, event.previousIndex, event.currentIndex);
        this._updateInputInfos();
    }

    async openMokuaiUrl() {
        const ids = this.result.模块.map((v) => v.type2);
        if (ids.some((v) => !v)) {
            this.message.error("当前配件模块数据是旧数据，请刷新数据");
            return;
        }
        this.spinner.show(this.spinnerId);
        const url = await this.dataService.getShortUrl("配件模块", {search2: {where_in: {vid: ids}}});
        this.spinner.hide(this.spinnerId);
        if (url) {
            // this.message.iframe(this.mokuaiUrl);
            open(url, "_blank");
        }
    }

    getMubanId(data: CadData) {
        return data.zhankai[0]?.kailiaomuban;
    }

    getMokuaiTitle(item: ZixuanpeijianMokuaiItem) {
        const {type1, type2} = item;
        return `${type1}【${type2}】`;
    }

    async setReplaceableMokuais(item: ZixuanpeijianMokuaiItem) {
        const typesInfo = cloneDeep(this.typesInfo);
        delete typesInfo[item.type1][item.type2];
        const result = await openZixuanpeijianDialog(this.dialog, {
            data: {
                step: 1,
                stepFixed: true,
                checkEmpty: this.data?.checkEmpty,
                data: {模块: item.可替换模块},
                可替换模块: false,
                step1Data: {prefix: this.urlPrefix, typesInfo, options: this.options}
            }
        });
        if (result) {
            item.可替换模块 = result.模块;
        }
    }
}

export const openZixuanpeijianDialog = getOpenDialogFunc<ZixuanpeijianComponent, ZixuanpeijianInput, ZixuanpeijianOutput>(
    ZixuanpeijianComponent,
    {width: "calc(100vw - 20px)", height: "calc(100vh - 10px)", disableClose: true}
);
