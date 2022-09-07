import {Component, OnInit, OnDestroy, Inject, ElementRef, ViewChild} from "@angular/core";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {imgCadEmpty, setGlobal} from "@app/app.common";
import {getCadPreview, getCadTotalLength} from "@app/cad.utils";
import {CadData, CadLine, CadLineLike, CadMtext, CadViewer, CadViewerConfig, setLinesLength} from "@cad-viewer";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {BancaiList, CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo, InputInfoString} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {getCADBeishu} from "@src/app/beishu";
import {Formulas, toFixed} from "@src/app/utils/calc";
import {ObjectOf, timeout} from "@utils";
import {cloneDeep, debounce, isEmpty, isEqual} from "lodash";
import {BehaviorSubject} from "rxjs";
import {getOpenDialogFunc} from "../dialog.common";
import {openKlkwpzDialog} from "../klkwpz-dialog/klkwpz-dialog.component";

@Component({
    selector: "app-zixuanpeijian",
    templateUrl: "./zixuanpeijian.component.html",
    styleUrls: ["./zixuanpeijian.component.scss"]
})
export class ZixuanpeijianComponent extends ContextMenu() implements OnInit, OnDestroy {
    spinnerId = "zixuanpeijian";
    step$ = new BehaviorSubject<{value: number; refresh: boolean}>({value: 0, refresh: false});
    type1 = "";
    type2 = "";
    urlPrefix = "";
    typesInfo: ZixuanpeijianTypesInfo = {};
    options: ObjectOf<string[]> = {};
    bancaiList: BancaiList[] = [];
    result: ZixuanpeijianOutput = {模块: [], 零散: []};
    cadViewers: {模块: ObjectOf<ObjectOf<CadViewer[]>>; 零散: CadViewer[]} = {模块: {}, 零散: []};
    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
    contextMenuData = {i: -1, j: -1};
    fractionDigits = 1;
    _step1Fetched = false;
    _step2Fetched = false;
    _step3Fetched = false;

    mokuaiInputInfos: MokuaiInputInfos[] = [];
    lingsanInputInfos: CadItemInputInfo[] = [];
    dropDownKeys: string[] = [];
    dropDownOptions: {label: string; value: string}[] = [];
    lingsanCads: ZixuanpeijianlingsanCadItem[] = [];
    lingsanCadTypes: string[] = [];
    lingsanCadType = "";
    lingsanCadsSearchData = {str: ""};
    lingsanCadsSearchInput: InputInfo = {
        type: "string",
        label: "搜索",
        onInput: debounce(
            ((str: string) => {
                str = str.toLowerCase();
                for (const item of this.lingsanCads) {
                    item.hidden = !!str && !item.data.name.toLowerCase().includes(str);
                }
            }).bind(this),
            500
        )
    };
    lingsanCadImgs: ObjectOf<SafeUrl> = {};
    lingsanCadViewers: CadViewer[] = [];
    imgCadEmpty = imgCadEmpty;

    onWindowResize = debounce(() => {
        this.resizeCadViewers();
    }, 500).bind(this);

    get summitBtnText() {
        switch (this.step$.value.value) {
            case 1:
                return "打开算料CAD";
            case 2:
                return "提交保存";
            default:
                return "提交";
        }
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
        private domSanitizer: DomSanitizer
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
                this.result = cloneDeep(data);
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

    private async _step1Fetch() {
        this.spinner.show(this.spinnerId);
        const response = await this.dataService.post<{
            prefix: string;
            typesInfo: ZixuanpeijianTypesInfo;
            options: ObjectOf<string[]>;
            cads2: CadData[];
        }>("ngcad/getZixuanpeijianTypesInfo", {}, {testData: "zixuanpeijianTypesInfo"});
        this.spinner.hide(this.spinnerId);
        if (response?.data) {
            this.urlPrefix = response.data.prefix;
            this.typesInfo = response.data.typesInfo;
            if (!this.type1) {
                this.type1 = Object.keys(this.typesInfo)[0] || "";
            }
            this.options = response.data.options;
        }
        this._updateInputInfos();
    }

    private async _step2Fetch() {
        const typesInfo: ObjectOf<ObjectOf<1>> = {};
        this.result.模块.forEach(({type1, type2}) => {
            if (!typesInfo[type1]) {
                typesInfo[type1] = {};
            }
            if (!typesInfo[type1][type2]) {
                typesInfo[type1][type2] = 1;
            }
        });
        const response = await this.dataService.post<{cads: ObjectOf<ObjectOf<any[]>>; bancais: BancaiList[]; dropDown: string[]}>(
            "ngcad/getZixuanpeijianCads",
            {typesInfo},
            {testData: "zixuanpeijianCads"}
        );
        if (response?.data) {
            const allCads: ObjectOf<ObjectOf<CadData[]>> = {};
            const {cads, bancais} = response.data;
            this.bancaiList = bancais;
            this.dropDownKeys = response.data.dropDown;
            for (const type1 in cads) {
                allCads[type1] = {};
                for (const type2 in cads[type1]) {
                    allCads[type1][type2] = [];
                    for (const v of cads[type1][type2]) {
                        const data = new CadData(v);
                        allCads[type1][type2].push(data);
                    }
                }
            }
            const cadViewers = this.cadViewers;
            cadViewers.模块 = {};
            cadViewers.零散 = [];
            const initCadViewer = (data: CadData, selector: string) => {
                const data2 = data.clone(true);
                this._configCad(data2);
                data2.entities.mtext = data2.entities.mtext.filter((e) => !e.info.isZhankaiText);

                const viewer = new CadViewer(data2, {
                    entityDraggable: ["MTEXT"],
                    selectMode: "single",
                    backgroundColor: "black"
                });
                if (this.data?.cadConfig) {
                    viewer.setConfig(this.data.cadConfig);
                }
                (async () => {
                    await viewer.render();
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
                for (const {data, info} of item.cads) {
                    if (cads1.find((v) => v.id === info.houtaiId)) {
                        cads2.push(data);
                        infos[data.id] = info;
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
                        info = {houtaiId: data.id, zhankai: []};
                    }
                    const cadItem: ZixuanpeijianCadItem = {data, info};
                    item.cads.push(cadItem);
                    const {data2, viewer} = initCadViewer(data, `#cad-viewer-模块-${i}-${j}`);
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
                const {viewer} = initCadViewer(item.data, `#cad-viewer-零散-${i}`);
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
        this._updateInputInfos();
    }

    private async _step3Fetch() {
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
            await timeout(0);
            this.setlingsanCadType(this.lingsanCadTypes[0]);
        }
        this._updateInputInfos();
    }

    private _configCad(data: CadData) {
        data.entities.dimension.forEach((e) => {
            const match = e.mingzi.match(/显示公式[ ]*[:：](.*)/);
            if (match) {
                e.info.显示公式 = match[1].trim();
            } else if (e.mingzi.includes("活动标注") || e.mingzi === "<>") {
                e.info.显示公式 = "<>";
                e.mingzi = "<>";
            } else if (isNaN(Number(e.mingzi))) {
                e.visible = false;
            }
            e.setStyle({text: {size: 36}});
        });
    }

    private _getDefaultZhankai(): ZixuanpeijianInfo["zhankai"][0] {
        return {width: "", height: "", num: "", originalWidth: "", isFromCad: false};
    }

    async calcZhankai(item: ZixuanpeijianCadItem) {
        const {data, info} = item;
        const {zhankai} = info;
        if (zhankai.length < 1 || !zhankai[0].originalWidth || zhankai[0].custom) {
            return;
        }
        const vars = {...this.data?.materialResult, 总长: toFixed(getCadTotalLength(data), 4)};
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

    async openKlkwpzDialog(data: CadData) {
        const result = await openKlkwpzDialog(this.dialog, {data: {source: data.info.开料孔位配置}});
        if (result) {
            data.info.开料孔位配置 = result;
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
                await this._step1Fetch();
                this._step1Fetched = true;
            }
        } else if (value === 2) {
            if (refresh || !this._step2Fetched) {
                await this._step2Fetch();
                this._step2Fetched = true;
            }
        } else if (value === 3) {
            if (refresh || !this._step3Fetched) {
                await this._step3Fetch();
                this._step3Fetched = true;
            }
        }
    }

    async submit() {
        const {value} = this.step$.value;
        if (value === 1) {
            const errors = new Set<string>();
            if (this.data?.checkEmpty) {
                for (const {totalWidth, totalHeight, gongshishuru, xuanxiangshuru} of this.result.模块) {
                    if (!totalWidth) {
                        errors.add("总宽不能为空");
                    }
                    if (!totalHeight) {
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
                this.setStep(2, true);
            }
        } else if (value === 2) {
            const errors = new Set<string>();
            if (this.data?.checkEmpty) {
                for (const {cads} of this.result.模块) {
                    for (const {data, info} of cads) {
                        if (data.info.hidden) {
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
            this.setStep(2, true);
        }
    }

    cancel() {
        if (this.step$.value.value === 2) {
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
        const options = this.dropDownOptions;
        options.length = 0;
        const vars = this.data?.materialResult || {};
        for (const key of this.dropDownKeys) {
            const value = Number(vars[key]);
            if (value > 0) {
                this.dropDownOptions.push({label: key, value: String(value)});
            }
        }

        const bancaiOptions: InputInfoString["options"] = this.bancaiList.map((v) => v.mingzi);
        const getCadItemInputInfos = (items: ZixuanpeijianCadItem[]) =>
            items.map<CadItemInputInfo>((item) => ({
                zhankai: item.info.zhankai.map<CadItemInputInfo["zhankai"][0]>((zhankai) => ({
                    width: {
                        type: "string",
                        label: "展开宽",
                        options,
                        model: {key: "width", data: zhankai},
                        showEmpty: true,
                        onChange: () => {
                            zhankai.custom = true;
                        }
                    },
                    height: {
                        type: "string",
                        label: "展开高",
                        options,
                        model: {key: "height", data: zhankai},
                        showEmpty: true,
                        onChange: () => {
                            zhankai.custom = true;
                        }
                    },
                    num: {
                        type: "string",
                        label: "数量",
                        model: {key: "num", data: zhankai},
                        showEmpty: true,
                        onChange: () => {
                            zhankai.custom = true;
                        }
                    }
                })),
                板材: {
                    type: "string",
                    label: "板材",
                    options: bancaiOptions,
                    value: item.info.bancai?.mingzi,
                    onChange: (val) => {
                        const bancai = cloneDeep(this.bancaiList.find((v) => v.mingzi === val));
                        if (bancai) {
                            if (item.info.bancai) {
                                item.info.bancai = {...item.info.bancai, ...bancai};
                                const {cailiaoList, cailiao, houduList, houdu} = item.info.bancai;
                                if (cailiao && !cailiaoList.includes(cailiao)) {
                                    delete item.info.bancai.cailiao;
                                }
                                if (houdu && !houduList.includes(houdu)) {
                                    delete item.info.bancai.houdu;
                                }
                            } else {
                                item.info.bancai = bancai;
                            }
                        } else {
                            delete item.info.bancai;
                        }
                        this._updateInputInfos();
                    },
                    optionInputOnly: true,
                    showEmpty: true
                },
                材料: {
                    type: "string",
                    label: "材料",
                    options: item.info.bancai?.cailiaoList || [],
                    model: {key: "cailiao", data: item.info.bancai},
                    optionInputOnly: true,
                    showEmpty: true
                },
                厚度: {
                    type: "string",
                    label: "厚度",
                    options: item.info.bancai?.houduList || [],
                    model: {key: "houdu", data: item.info.bancai},
                    optionInputOnly: true,
                    showEmpty: true
                }
            }));

        this.mokuaiInputInfos = this.result.模块.map<MokuaiInputInfos>((item, i) => ({
            总宽: {type: "string", label: "总宽", model: {key: "totalWidth", data: item}, showEmpty: true, options},
            总高: {type: "string", label: "总高", model: {key: "totalHeight", data: item}, showEmpty: true, options},
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
            cads: getCadItemInputInfos(item.cads)
        }));
        this.lingsanInputInfos = getCadItemInputInfos(this.result.零散);
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
        const vars = this.data?.materialResult || {};
        const result = this.calc.calcFormulas(formulas, vars, false);
        if (result) {
            const {succeed} = result;
            for (const group of typesItem.gongshishuru) {
                if (succeed[group[0]] > 0 && !(group[0] in gongshishuru)) {
                    group[1] = toFixed(succeed[group[0]], this.fractionDigits);
                }
            }
            for (const group of typesItem.xuanxiangshuru) {
                if (group[0] in succeed && !(group[0] in xuanxiangshuru)) {
                    const value = succeed[group[0]];
                    if (typeof value === "number") {
                        group[1] = toFixed(value, this.fractionDigits);
                    } else {
                        group[1] = value;
                    }
                }
            }
            if (succeed.总宽 > 0) {
                item.totalWidth = toFixed(succeed.总宽, this.fractionDigits);
            }
            if (succeed.总高 > 0) {
                item.totalHeight = toFixed(succeed.总高, this.fractionDigits);
            }
        }
        this._updateInputInfos();
    }

    removeMokuaiItem(i: number) {
        this.result.模块.splice(i, 1);
        this._updateInputInfos();
    }

    addLingsanItem(i: number) {
        const data = this.lingsanCads[i].data;
        this.result.零散.push({data: data.clone(true), info: {houtaiId: data.id, zhankai: []}});
        this._updateInputInfos();
    }

    removeLingsanItem(i: number) {
        this.result.零散.splice(i, 1);
        this._updateInputInfos();
    }

    addMokuaiZhankai(i: number, j: number, k: number) {
        this.result.模块[i].cads[j].info.zhankai.splice(k + 1, 0, this._getDefaultZhankai());
        this._updateInputInfos();
    }

    removeMokuaiZhankai(i: number, j: number, k: number) {
        this.result.模块[i].cads[j].info.zhankai.splice(k, 1);
        this._updateInputInfos();
    }

    addLingsanZhankai(i: number, j: number) {
        this.result.零散[i].info.zhankai.splice(j + 1, 0, this._getDefaultZhankai());
        this._updateInputInfos();
    }

    removeLingsanZhankai(i: number, j: number) {
        this.result.零散[i].info.zhankai.splice(j, 1);
        this._updateInputInfos();
    }

    private _calc(): boolean {
        const materialResult = this.data?.materialResult || {};
        const shuchubianliang: Formulas = {};
        const toCalc1 = this.result.模块.map((item) => {
            const formulas = {...item.suanliaogongshi};
            formulas.总宽 = item.totalWidth;
            formulas.总高 = item.totalHeight;
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
                    vars[name] = points[0].distanceTo(points[1]);
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
                const vars1 = {...materialResult, ...v.vars, ...shuchubianliang};
                const result1 = this.calc.calcFormulas(formulas1, vars1, alertError);
                // console.log({formulas1, vars1, result1});
                if (!result1) {
                    if (alertError) {
                        return false;
                    } else {
                        continue;
                    }
                }
                for (const vv of v.item.shuchubianliang) {
                    if (vv in result1.succeed) {
                        // if (vv in shuchubianliang) {
                        //     this.message.error(`${type1}, ${type2}输出变量重复<br>${vv}`);
                        //     return false;
                        // }
                        shuchubianliang[vv] = result1.succeed[vv];
                    }
                }
                v.succeed = result1.succeed;
                v.error = result1.error;
                if (!isEmpty(result1.error)) {
                    calc1Finished = false;
                    calcErrors2 = {...calcErrors2, ...result1.error};
                }
            }
            initial = false;
        }
        console.log({toCalc1, shuchubianliang, indexesMap});
        Object.assign(materialResult, shuchubianliang);

        const calcCadItem = ({data, info}: ZixuanpeijianCadItem, vars2: Formulas) => {
            const formulas2: Formulas = {};

            const zhankaiErrors: [string, string][] = [];
            const zhankais = data.zhankai.filter((zhankai) =>
                zhankai.conditions.every((condition) => {
                    const result = this.calc.calc.calcExpress(condition, vars2);
                    if (result.error) {
                        zhankaiErrors.push([condition, result.error]);
                        return false;
                    }
                    return !!result.value;
                })
            );
            if (zhankaiErrors.length > 0) {
                // let str = `${data.name} 展开条件出错<br>`;
                // str += zhankaiErrors.map(([condition, error]) => `${condition}<br>${error}`).join("<br><br>");
                // this.message.error(str);
                // return false;
                console.warn({name: data.name, zhankaiErrors});
            }
            if (zhankais.length < 1) {
                data.info.hidden = true;
            } else {
                data.info.hidden = false;
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
                const vars3 = {...vars2, 总长: toFixed(getCadTotalLength(data), 4)};
                const zhankais2: ZixuanpeijianInfo["zhankai"] = [];
                for (const zhankai of zhankais) {
                    const formulas3: Formulas = {};
                    formulas3.展开宽 = zhankai.zhankaikuan;
                    formulas3.展开高 = zhankai.zhankaigao;
                    formulas3.数量 = `(${zhankai.shuliang})*(${zhankai.shuliangbeishu})`;
                    const result3 = this.calc.calcFormulas(formulas3, vars3, {data});
                    // console.log({formulas3, vars3, result3});
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
                    zhankais2.push({width, height, num: String(num), originalWidth: zhankai.zhankaikuan, isFromCad: true});
                }
                info.zhankai = [...zhankais2, ...info.zhankai.filter((v) => !v.isFromCad)];
                if (info.zhankai.length < 1) {
                    info.zhankai.push(this._getDefaultZhankai());
                }
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

    openCad(item: ZixuanpeijianCadItem) {
        this.status.openCadInNewTab(item.info.houtaiId, "cad");
    }

    showItem(item: ZixuanpeijianTypesInfoItem) {
        const xinghaoId = String(this.data?.materialResult?.型号id || "");
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
}

export const openZixuanpeijianDialog = getOpenDialogFunc<ZixuanpeijianComponent, ZixuanpeijianInput, ZixuanpeijianOutput>(
    ZixuanpeijianComponent
);

export interface ZixuanpeijianTypesInfoItem {
    xiaoguotu: string;
    jiemiantu: string;
    gongshishuru: string[][];
    xuanxiangshuru: string[][];
    suanliaogongshi: Formulas;
    shuchubianliang: string[];
    xinghaozhuanyong: string[];
    mokuaishuoming: string;
}
export type ZixuanpeijianTypesInfo = ObjectOf<ObjectOf<ZixuanpeijianTypesInfoItem>>;

export interface ZixuanpeijianInputsInfoItem {
    totalWidth: InputInfo;
    totalHeight: InputInfo;
    gongshishuru: InputInfo[][];
}
export type ZixuanpeijianInputsInfos = ObjectOf<ObjectOf<ZixuanpeijianInputsInfoItem>>;

export interface ZixuanpeijianInput {
    step: number;
    data?: ZixuanpeijianOutput;
    checkEmpty?: boolean;
    cadConfig?: Partial<CadViewerConfig>;
    materialResult?: Formulas;
}

export interface ZixuanpeijianInfo {
    houtaiId: string;
    zhankai: {width: string; height: string; num: string; originalWidth: string; isFromCad: boolean; custom?: boolean}[];
    bancai?: BancaiList & {cailiao?: string; houdu?: string};
}

export interface Bancai extends BancaiList {
    cailiao?: string;
    houdu?: string;
}

export interface ZixuanpeijianCadItem {
    data: CadData;
    displayedData?: CadData;
    info: ZixuanpeijianInfo;
}

export interface ZixuanpeijianMokuaiItem extends ZixuanpeijianTypesInfoItem {
    type1: string;
    type2: string;
    totalWidth: string;
    totalHeight: string;
    cads: ZixuanpeijianCadItem[];
}

export type ZixuanpeijianOutput = {模块: ZixuanpeijianMokuaiItem[]; 零散: ZixuanpeijianCadItem[]};

export interface CadItemInputInfo {
    zhankai: {
        width: InputInfo;
        height: InputInfo;
        num: InputInfo;
    }[];
    板材: InputInfo;
    材料: InputInfo;
    厚度: InputInfo;
}

export interface MokuaiInputInfos {
    总宽: InputInfo;
    总高: InputInfo;
    公式输入: InputInfo[];
    选项输入: InputInfo[];
    cads: CadItemInputInfo[];
}

export interface ZixuanpeijianlingsanCadItem {
    data: CadData;
    img: SafeUrl;
    hidden: boolean;
}
