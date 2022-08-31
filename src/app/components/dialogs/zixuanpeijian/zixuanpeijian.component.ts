import {Component, OnInit, OnDestroy, Inject, ElementRef, ViewChild} from "@angular/core";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {setGlobal} from "@app/app.common";
import {getCadTotalLength} from "@app/cad.utils";
import {CadData, CadLine, CadLineLike, CadMtext, CadViewer, CadViewerConfig, CadZhankai, setLinesLength} from "@cad-viewer";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {BancaiList, CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CalcService} from "@services/calc.service";
import {getCADBeishu} from "@src/app/beishu";
import {Formulas, toFixed} from "@src/app/utils/calc";
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
    fractionDigits = 1;

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
        }
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
                    this._configCad(data2);
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
                        await cadViewer.render(cadViewer.data.entities.dimension);
                        cadViewer.center();
                    }
                }
            }
        }
    }

    private _configCad(data: CadData) {
        data.entities.dimension.forEach((e) => {
            const match = e.mingzi.match(/显示公式[ ]*[:：](.*)/);
            if (match) {
                e.info.显示公式 = match[1].trim();
            } else if (e.mingzi.includes("活动标注") || e.mingzi === "<>") {
                e.mingzi = "<>";
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
        if (zhankai.length < 1 || !zhankai[0].originalWidth) {
            return;
        }
        const vars = {总长: toFixed(getCadTotalLength(data), 4)};
        const formulas: ObjectOf<string> = {展开宽: zhankai[0].originalWidth};
        const calcResult = this.calc.calcFormulas(formulas, vars);
        const {展开宽} = calcResult?.succeed || {};
        if (typeof 展开宽 === "number" && !isNaN(展开宽)) {
            zhankai[0].width = toFixed(展开宽, this.fractionDigits);
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
                for (const {totalWidth, totalHeight, gongshishuru, xuanxiangshuru} of this.result) {
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
                this.step$.next({value: 2, refresh: true});
            }
        } else if (value === 2) {
            const errors = new Set<string>();
            if (this.data?.checkEmpty) {
                for (const {cads} of this.result) {
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
        const item: ZixuanpeijianOutputItem = {type1, type2, totalWidth: "", totalHeight: "", ...typesItem, cads: []};
        const item2 = this.result.find((v) => v.type1 === type1 && v.type2 === type2);
        if (item2) {
            item.gongshishuru = cloneDeep(item2.gongshishuru);
            item.xuanxiangshuru = cloneDeep(item2.xuanxiangshuru);
        }
        this.result.push(item);
        const formulas = typesItem.suanliaogongshi;
        const vars = this.data?.materialResult || {};
        const result = this.calc.calcFormulas(formulas, vars, false);
        // console.log(formulas, vars, result);
        if (result) {
            const {succeed} = result;
            for (const group of typesItem.gongshishuru) {
                if (succeed[group[0]] > 0) {
                    group[1] = toFixed(succeed[group[0]], this.fractionDigits);
                }
            }
            for (const group of typesItem.xuanxiangshuru) {
                if (succeed[group[0]] > 0) {
                    group[1] = toFixed(succeed[group[0]], this.fractionDigits);
                }
            }
            if (succeed.总宽 > 0) {
                item.totalWidth = toFixed(succeed.总宽, this.fractionDigits);
            }
            if (succeed.总高 > 0) {
                item.totalHeight = toFixed(succeed.总高, this.fractionDigits);
            }
        }
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
        const shuchubianliangMap: ObjectOf<ObjectOf<Formulas>> = {};
        const result1s = [];
        for (const item of this.result) {
            const formulas1 = item.suanliaogongshi;
            formulas1.总宽 = item.totalWidth;
            formulas1.总高 = item.totalHeight;
            const vars1: Formulas = materialResult;
            for (const group of item.gongshishuru) {
                formulas1[group[0]] = group[1];
            }
            for (const group of item.xuanxiangshuru) {
                formulas1[group[0]] = `'${group[1]}'`;
            }
            for (const cad of item.cads) {
                const data = cad.data;
                for (const dimension of data.entities.dimension) {
                    const points = data.getDimensionPoints(dimension);
                    if (points.length < 4 || !dimension.mingzi) {
                        continue;
                    }
                    vars1[dimension.mingzi] = points[0].distanceTo(points[1]);
                }
            }
            const result1 = this.calc.calcFormulas(formulas1, vars1, false);
            // console.log({formulas1, vars1, result1});
            if (!result1) {
                return false;
            }
            result1s.push(result1);
            const missingKeys = [];
            const {type1, type2} = item;
            if (!shuchubianliangMap[type1]) {
                shuchubianliangMap[type1] = {};
            }
            if (!shuchubianliangMap[type1][type2]) {
                shuchubianliangMap[type1][type2] = {};
            }
            for (const key of item.shuchubianliang) {
                if (!(key in result1.succeed)) {
                    missingKeys.push(key);
                }
                shuchubianliangMap[type1][type2][key] = result1.succeed[key];
            }
            if (missingKeys.length > 0) {
                this.message.error(`${type1}, ${type2}缺少输出变量<br>${missingKeys.join(", ")}`);
                return false;
            }
        }
        const shuchubianliang: Formulas = {};
        for (const type1 in shuchubianliangMap) {
            for (const type2 in shuchubianliangMap[type1]) {
                const duplicateKeys = [];
                for (const [key, value] of Object.entries(shuchubianliangMap[type1][type2])) {
                    if (key in shuchubianliang) {
                        duplicateKeys.push(key);
                    } else {
                        shuchubianliang[key] = value;
                    }
                }
                if (duplicateKeys.length > 0) {
                    this.message.error(`${type1}, ${type2}输出变量重复<br>${duplicateKeys.join(", ")}`);
                    return false;
                }
            }
        }

        for (const [i, item] of this.result.entries()) {
            const formulas2 = item.suanliaogongshi;
            const vars2 = {...result1s[i].succeed, ...shuchubianliang};
            const result2 = this.calc.calcFormulas(formulas2, vars2);
            // console.log({formulas2, vars2, result2});
            if (!result2) {
                return false;
            }

            for (const cadItem of item.cads) {
                const {data, info} = cadItem;
                const formulas3: Formulas = {};
                const vars3: Formulas = result2.succeed;
                for (const [j, e] of data.entities.line.entries()) {
                    if (e.gongshi) {
                        formulas3[`线${j + 1}公式`] = e.gongshi;
                    }
                }
                for (const e of data.entities.dimension) {
                    if (e.info.显示公式) {
                        if (e.info.显示公式 in vars3) {
                            e.mingzi = toFixed(vars3[e.info.显示公式], this.fractionDigits);
                        } else {
                            e.mingzi = e.info.显示公式;
                        }
                    }
                }
                const result3 = this.calc.calcFormulas(formulas3, vars3, true);
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

                const zhankaiErrors: [string, string][] = [];
                const zhankais: {zhankai: CadZhankai; enable: boolean}[] = data.zhankai.map((zhankai) => {
                    const enable = zhankai.conditions.every((condition) => {
                        const result = this.calc.calc.calcExpress(condition, vars3);
                        if (result.error) {
                            zhankaiErrors.push([condition, result.error]);
                            return false;
                        }
                        return !!result.value;
                    });
                    return {zhankai, enable};
                });
                if (zhankaiErrors.length > 0) {
                    // let str = `${data.name} 展开条件出错<br>`;
                    // str += zhankaiErrors.map(([condition, error]) => `${condition}<br>${error}`).join("<br><br>");
                    // this.message.error(str);
                    // return false;
                    console.warn({name: data.name, zhankaiErrors});
                }
                if (zhankais.every((v) => !v.enable)) {
                    data.info.hidden = true;
                } else {
                    data.info.hidden = false;
                    const vars4 = {...vars3, 总长: toFixed(getCadTotalLength(data), 4)};
                    const toRemove: number[] = [];
                    for (const [j, {zhankai, enable}] of zhankais.entries()) {
                        if (!enable) {
                            toRemove.push(j);
                            continue;
                        }
                        const formulas4: Formulas = {};
                        formulas4.展开宽 = zhankai.zhankaikuan;
                        formulas4.展开高 = zhankai.zhankaigao;
                        formulas4.数量 = `${zhankai.shuliang}*${zhankai.shuliangbeishu}`;
                        const result4 = this.calc.calcFormulas(formulas4, vars4);
                        // console.log({formulas4, vars4, result: result4});
                        if (!result4) {
                            return false;
                        }
                        const width = toFixed(result4.succeedTrim.展开宽, this.fractionDigits);
                        const height = toFixed(result4.succeedTrim.展开高, this.fractionDigits);
                        let num = Number(result4.succeedTrim.数量);
                        const {产品分类, 栋数, 门中门扇数} = materialResult;
                        const CAD分类 = data.type;
                        const CAD分类2 = data.type2;
                        num *= getCADBeishu(String(产品分类), String(栋数), CAD分类, CAD分类2, String(门中门扇数));
                        info.zhankai[j] = {width, height, num: String(num), originalWidth: width};
                    }
                    if (toRemove.length > 0) {
                        info.zhankai = info.zhankai.filter((_, j) => !toRemove.includes(j));
                    }
                    if (info.zhankai.length < 1) {
                        info.zhankai.push({width: "", height: "", num: "0", originalWidth: ""});
                    } else {
                        for (const zhankai of info.zhankai.slice(1)) {
                            zhankai.width = info.zhankai[0].width;
                        }
                    }
                }
            }
        }
        return true;
    }

    openCad(item: ZixuanpeijianCadItem) {
        this.status.openCadInNewTab(item.info.houtaiId, "cad");
    }

    showItem(item: ZixuanpeijianTypesInfoItem) {
        const xinghaoId = String(this.data?.materialResult?.型号id || "");
        return !xinghaoId || !(item.xinghaozhuanyong?.length > 0) || item.xinghaozhuanyong.includes(xinghaoId);
    }

    getGongshishuruInputInfo(group: ZixuanpeijianTypesInfoItem["gongshishuru"][0], itemIndex: number): InputInfo {
        return {
            type: "string",
            label: group[0],
            model: {key: "1", data: group},
            showEmpty: true,
            onChange: () => {
                const {type1, type2, gongshishuru, xuanxiangshuru} = this.result[itemIndex];
                for (const [i, item] of this.result.entries()) {
                    if (i === itemIndex || item.type1 !== type1 || item.type2 !== type2) {
                        continue;
                    }
                    item.gongshishuru = cloneDeep(gongshishuru);
                    item.xuanxiangshuru = cloneDeep(xuanxiangshuru);
                }
            }
        };
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
