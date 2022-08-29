import {Component, OnInit, OnDestroy, Inject, ElementRef, ViewChild} from "@angular/core";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {setDevComponent} from "@app/app.common";
import {getCadTotalLength} from "@app/cad.utils";
import {CadData, CadLine, CadLineLike, CadMtext, CadViewer, CadViewerConfig, CadZhankai, setLinesLength} from "@cad-viewer";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {BancaiList, CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf, timeout} from "@utils";
import {cloneDeep, debounce} from "lodash";
import {BehaviorSubject} from "rxjs";
import {openBancaiListDialog} from "../bancai-list/bancai-list.component";
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
    bancaiList: BancaiList[] = [];
    result: ZixuanpeijianOutput = [];
    cadViewers: ObjectOf<ObjectOf<CadViewer[]>> = {};
    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
    contextMenuData = {i: -1, j: -1};

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
        private status: AppStatusService
    ) {
        super();
        if (data) {
            if (data.data) {
                this.result = data.data;
            }
            if (typeof data.step === "number") {
                this.step$.next({value: data.step, refresh: true});
            }
        }
    }

    async ngOnInit() {
        setDevComponent("zxpj", this);
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
        this.step$.next({value: stepValue, refresh: true});
        const response = await this.dataService.get<{cads: any[]; bancais: BancaiList[]}>("ngcad/getZixuanpeijian");
        if (response?.data) {
            // response.data.cads.forEach((v) => cads.push(new CadData(v)));
            this.bancaiList = response.data.bancais;
        }
        window.addEventListener("resize", this.onWindowResize);
    }

    ngOnDestroy() {
        window.removeEventListener("resize", this.onWindowResize);
    }

    private async _step1Fetch() {
        this.spinner.show(this.spinnerId);
        const response = await this.dataService.post<{prefix: string; typesInfo: ZixuanpeijianTypesInfo}>(
            "ngcad/getZixuanpeijianTypesInfo",
            {},
            {testData: "zixuanpeijianTypesInfo"}
        );
        this.spinner.hide(this.spinnerId);
        if (response?.data) {
            this.urlPrefix = response.data.prefix;
            this.typesInfo = response.data.typesInfo;
            if (!this.type1) {
                this.type1 = Object.keys(this.typesInfo).sort()[0] || "";
            }
        }
    }

    private async _step2Fetch() {
        const typesInfo: ObjectOf<ObjectOf<1>> = {};
        this.result.forEach(({type1, type2}) => {
            if (!typesInfo[type1]) {
                typesInfo[type1] = {};
            }
            if (!typesInfo[type1][type2]) {
                typesInfo[type1][type2] = 1;
            }
        });
        const response = await this.dataService.post<ObjectOf<ObjectOf<any[]>>>(
            "ngcad/getZixuanpeijianCads",
            {typesInfo},
            {testData: "zixuanpeijianCads"}
        );
        if (response?.data) {
            const allCads: ObjectOf<ObjectOf<CadData[]>> = {};
            for (const type1 in response.data) {
                allCads[type1] = {};
                for (const type2 in response.data[type1]) {
                    allCads[type1][type2] = [];
                    for (const v of response.data[type1][type2]) {
                        const data = new CadData(v);
                        this._configCad(data);
                        allCads[type1][type2].push(data);
                    }
                }
            }
            this.cadViewers = {};
            for (const [i, item] of this.result.entries()) {
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
                    const data2 = data.clone(true);
                    data2.entities.mtext = data2.entities.mtext.filter((e) => !e.info.isZhankaiText);
                    let info: ZixuanpeijianInfo | undefined = infos[data.id];
                    if (!info) {
                        info = {houtaiId: data.id, zhankai: []};
                        if (data.zhankai.length > 0) {
                            info.zhankai = data.zhankai.map((v) => ({
                                width: v.zhankaikuan,
                                // height: v.zhankaigao,
                                height: "",
                                num: v.shuliang,
                                originalWidth: v.zhankaikuan
                            }));
                        } else {
                            info.zhankai = [this._getDefaultZhankai()];
                        }
                    }
                    const cadItem: ZixuanpeijianCadItem = {data: data2, info};
                    item.cads.push(cadItem);

                    const viewer = new CadViewer(data2, {
                        entityDraggable: ["MTEXT"],
                        selectMode: "single",
                        backgroundColor: "black"
                    });
                    if (this.data?.cadConfig) {
                        viewer.setConfig(this.data.cadConfig);
                    }
                    await viewer.render();
                    if (!this.cadViewers[type1]) {
                        this.cadViewers[type1] = {};
                    }
                    if (!this.cadViewers[type1][type2]) {
                        this.cadViewers[type1][type2] = [];
                    }
                    this.cadViewers[type1][type2].push(viewer);

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
                                this.calcZhankai(cadItem);
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

                    await this.calcZhankai(cadItem);
                    await timeout(0);
                    const el = this.elRef.nativeElement.querySelector(`#cad-viewer-${i}-${j}`);
                    if (el instanceof HTMLElement) {
                        viewer.appendTo(el);
                        this.resizeCadViewers([i, length - 1]);
                    }
                });
            }
        }
        if (this._calc()) {
            for (const type1 in this.cadViewers) {
                for (const type2 in this.cadViewers[type1]) {
                    const cadViewers = this.cadViewers[type1][type2];
                    for (const cadViewer of cadViewers) {
                        await cadViewer.render();
                        cadViewer.center();
                    }
                }
            }
        }
    }

    private _configCad(data: CadData) {
        data.entities.dimension.forEach((e) => {
            if (e.mingzi.includes("活动标注")) {
                e.mingzi = "<>";
            }
        });
    }

    private _getDefaultZhankai(): ZixuanpeijianInfo["zhankai"][0] {
        return {width: "", height: "", num: "", originalWidth: ""};
    }

    async calcZhankai(item: ZixuanpeijianCadItem) {
        const {data, info} = item;
        const {zhankai} = info;
        if (zhankai.length < 1 || !zhankai[0].originalWidth) {
            return;
        }
        const vars = {总长: getCadTotalLength(data)};
        const formulas: ObjectOf<string> = {展开宽: zhankai[0].originalWidth};
        const calcResult = this.calc.calcFormulas(formulas, vars);
        const {展开宽} = calcResult?.succeed || {};
        if (typeof 展开宽 === "number" && !isNaN(展开宽)) {
            zhankai[0].width = 展开宽.toString();
        }
        info.zhankai = zhankai;
    }

    resizeCadViewers(indexes?: [number, number]) {
        for (const [i, item] of this.result.entries()) {
            const {type1, type2} = item;
            const cadViewers = this.cadViewers[type1]?.[type2];
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

    async openBancaiListDialog(i: number, j: number) {
        const info = this.result[i].cads[j].info;
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
        const {type1, type2} = this.result[i];
        const cadViewer = this.cadViewers[type1]?.[type2]?.[j];
        if (cadViewer) {
            cadViewer.center();
        }
    }

    private async _onStep({value, refresh}: ZixuanpeijianComponent["step$"]["value"]) {
        if (value === 1) {
            if (refresh) {
                await this._step1Fetch();
            }
        } else if (value === 2) {
            if (refresh) {
                await this._step2Fetch();
            }
        }
    }

    exportItems() {
        return this.result.map<ZixuanpeijianOutputItem>((item) => {
            const cads = item.cads.map(({data, info}) => ({data, info}));
            return {...item, cads};
        });
    }

    async submit() {
        const {value} = this.step$.value;
        if (value === 1) {
            const errors = new Set<string>();
            if (this.data?.checkEmpty) {
                for (const {totalWidth, totalHeight, gongshishuru} of this.result) {
                    if (!totalWidth) {
                        errors.add("总宽不能为空");
                    }
                    if (!totalHeight) {
                        errors.add("总高不能为空");
                    }
                    if (!gongshishuru.every((v) => v.every(Boolean))) {
                        errors.add("公式输入不能为空");
                    }
                }
            }
            if (errors.size > 0 && this.data?.checkEmpty) {
                this.message.error(Array.from(errors).join("<br>"));
            } else {
                this.step$.next({value: 2, refresh: true});
            }
        } else if (value === 2) {
            const errors = new Set<string>();
            if (this.data?.checkEmpty) {
                for (const {cads} of this.result) {
                    for (const {data, info} of cads) {
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
                    }
                }
            }
            if (errors.size > 0) {
                this.message.error(Array.from(errors).join("<br>"));
            } else {
                if (this._calc()) {
                    this.dialogRef.close(this.exportItems());
                }
            }
        }
    }

    cancle() {
        const {value} = this.step$.value;
        if (value === 1) {
            this.dialogRef.close();
        } else if (value === 2) {
            this.step$.next({value: 1, refresh: false});
        }
    }

    setTypesInfo1(type1: string) {
        this.type1 = type1;
    }

    addResultItem(type1: string, type2: string) {
        const typesItem = cloneDeep(this.typesInfo[type1][type2]);
        this.result.push({type1, type2, totalWidth: "", totalHeight: "", ...typesItem, cads: []});
    }

    removeResultItem(i: number) {
        this.result.splice(i, 1);
    }

    addZhankai(i: number, j: number, k: number) {
        this.result[i].cads[j].info.zhankai.splice(k + 1, 0, this._getDefaultZhankai());
    }

    removeZhankai(i: number, j: number, k: number) {
        this.result[i].cads[j].info.zhankai.splice(k, 1);
    }

    private _calc(): boolean {
        const materialResult = this.data?.materialResult || {};
        const shuchubianliang: Formulas = {};
        const itemVarsArr: Formulas[] = [];
        for (const item of this.result) {
            const itemVars: Formulas = {总宽: item.totalWidth, 总高: item.totalHeight};
            for (const v of item.gongshishuru) {
                itemVars[v[0]] = v[1];
            }
            for (const cad of item.cads) {
                const data = cad.data;
                for (const dimension of data.entities.dimension) {
                    const points = data.getDimensionPoints(dimension);
                    if (points.length < 4 || !dimension.mingzi) {
                        continue;
                    }
                    itemVars[dimension.mingzi] = points[0].distanceTo(points[1]);
                }
            }
            itemVarsArr.push(itemVars);

            const formulas1 = item.suanliaogongshi;
            const vars1: ObjectOf<any> = {...materialResult, ...itemVars};
            const result1 = this.calc.calcFormulas(formulas1, vars1, true, false);
            // console.log({formulas1, vars1, result1});
            if (!result1) {
                return false;
            }
            const missingKeys = [];
            const duplicateKeys = [];
            for (const key of item.shuchubianliang) {
                if (!(key in result1.succeed)) {
                    missingKeys.push(key);
                }
                if (key in shuchubianliang) {
                    duplicateKeys.push(key);
                }
                shuchubianliang[key] = result1.succeed[key];
            }
            if (missingKeys.length > 0) {
                this.message.error(`${item.type1}, ${item.type2}缺少输出变量：${missingKeys.join(", ")}`);
                return false;
            }
            if (duplicateKeys.length > 0) {
                this.message.error(`${item.type1}, ${item.type2}输出变量重复：${missingKeys.join(", ")}`);
                return false;
            }
        }
        for (const [i, item] of this.result.entries()) {
            const formulas2 = item.suanliaogongshi;
            const vars2 = {...materialResult, ...itemVarsArr[i], ...shuchubianliang};
            const result2 = this.calc.calcFormulas(formulas2, vars2, true, true);
            // console.log({formulas2, vars2, result2});
            if (!result2) {
                return false;
            }

            for (const cadItem of item.cads) {
                const {data, info} = cadItem;
                const formulas3: Formulas = {};
                for (const [j, e] of data.entities.line.entries()) {
                    if (e.gongshi) {
                        formulas3[`线${j + 1}公式`] = e.gongshi;
                    }
                }
                const vars3 = {...vars2, ...result2.succeedTrim};
                const result3 = this.calc.calcFormulas(formulas3, vars3, true, true);
                // console.log({formulas3, vars3, result3});
                if (!result3) {
                    return false;
                }
                for (const key in result3.succeedTrim) {
                    const match = key.match(/线(\d+)公式/);
                    const value = result3.succeedTrim[key];
                    if (match) {
                        const index = Number(match[1]);
                        // if (typeof value !== "number" || !(value > 0)) {
                        //     this.message.error(`线长公式出错<br>${data.name}的第${index}根线<br>${formulas3[key]} = ${value}`);
                        //     return false;
                        // }
                        setLinesLength(data, [data.entities.line[index - 1]], Number(value));
                    }
                }

                const zhankais = data.zhankai.filter((zhankai) =>
                    zhankai.conditions.every((condition) => {
                        const result = this.calc.calc.calcExpress(condition);
                        if (!result.error && result.value) {
                            return true;
                        }
                        return false;
                    })
                );
                if (zhankais.length < 1) {
                    // data.info.hidden = true;
                } else {
                    const vars4 = {...vars3, 总长: getCadTotalLength(data)};
                    for (const [j, zhankai] of zhankais.entries()) {
                        const formulas4: Formulas = {};
                        formulas4.展开宽 = zhankai.zhankaikuan;
                        formulas4.展开高 = zhankai.zhankaigao;
                        formulas4.数量 = `${zhankai.shuliang}*${zhankai.shuliangbeishu}`;
                        const result4 = this.calc.calcFormulas(formulas4, vars4, true, true);
                        // console.log({formulas4, vars4, result: result4});
                        if (!result4) {
                            return false;
                        }
                        const width = String(result4.succeedTrim.展开宽);
                        const height = String(result4.succeedTrim.展开高);
                        const num = String(result4.succeedTrim.数量);
                        info.zhankai[j] = {width, height, num, originalWidth: width};
                    }
                    for (const zhankai of info.zhankai) {
                        zhankai.width = info.zhankai[0].width;
                    }
                }
            }
        }
        return true;
    }

    openCad(item: ZixuanpeijianCadItem) {
        this.status.openCadInNewTab(item.info.houtaiId, "cad");
    }
}

export const openZixuanpeijianDialog = getOpenDialogFunc<ZixuanpeijianComponent, ZixuanpeijianInput, ZixuanpeijianOutput>(
    ZixuanpeijianComponent
);

export interface ZixuanpeijianTypesInfoItem {
    xiaoguotu: string;
    jiemiantu: string;
    gongshishuru: string[][];
    suanliaogongshi: Formulas;
    shuchubianliang: string[];
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
    zhankai: {width: string; height: string; num: string; originalWidth: string}[];
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

export interface ZixuanpeijianOutputItem extends ZixuanpeijianTypesInfoItem {
    type1: string;
    type2: string;
    totalWidth: string;
    totalHeight: string;
    cads: ZixuanpeijianCadItem[];
}

export type ZixuanpeijianOutput = ZixuanpeijianOutputItem[];
