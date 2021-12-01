import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {DomSanitizer} from "@angular/platform-browser";
import {imgLoading, timer} from "@app/app.common";
import {removeCadGongshi, getCadPreview, setCadData} from "@app/cad.utils";
import {CadData, CadEntities, CadHatch} from "@cad-viewer";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {openJsonEditorDialog} from "@components/dialogs/json-editor/json-editor.component";
import {ContextMenu} from "@mixins/context-menu.mixin";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService, AppConfig} from "@services/app-config.service";
import {SelectedCadType, AppStatusService, SelectedCads} from "@services/app-status.service";
import {CadStatusSplit, CadStatusAssemble} from "@services/cad-status";
import {downloadByString, ObjectOf, Point} from "@utils";
import {concat, isEqual, keyBy, pull, pullAll} from "lodash";

interface CadNode {
    data: CadData;
    img: string;
    checked: boolean;
    indeterminate: boolean;
    parent?: string;
}

@Component({
    selector: "app-sub-cads",
    templateUrl: "./sub-cads.component.html",
    styleUrls: ["./sub-cads.component.scss"]
})
export class SubCadsComponent extends ContextMenu(Subscribed()) implements OnInit, OnDestroy {
    cads: CadNode[] = [];
    partners: CadNode[] = [];
    components: CadNode[] = [];
    multiSelect = true;
    checkedIndex = -1;
    field?: SelectedCadType;
    cadDisabled = false;
    partnersDisabled = false;
    componentsDisabled = false;
    needsReload: string | null = null;
    cadsExpanded = true;
    partnersExpanded = true;
    componentsExpanded = true;
    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;
    @ViewChild("dxfInut", {read: ElementRef}) dxfInut!: ElementRef<HTMLElement>;
    contextMenuCad?: {field: SelectedCadType; data: CadData};
    private _prevId = "";
    private lastPointer: Point | null = null;
    private entitiesToMove?: CadEntities;
    private entitiesNotToMove?: CadEntities;

    get selected() {
        const cads = this.cads.filter((v) => v.checked).map((v) => v.data);
        const partners = this.partners.filter((v) => v.checked).map((v) => v.data);
        const components = this.components.filter((v) => v.checked).map((v) => v.data);
        return {cads, partners, components};
    }

    get disabled() {
        return this.status.disabledCadTypes$.value;
    }
    set disabled(value) {
        this.status.disabledCadTypes$.next(value);
    }

    private splitCad = (({key}: KeyboardEvent) => {
        if (key !== "Enter") {
            return;
        }
        const cadStatus = this.status.cadStatus;
        if (!(cadStatus instanceof CadStatusSplit)) {
            return;
        }
        const cad = this.status.cad;
        const entities = cad.selected();
        if (entities.length < 1) {
            return;
        }
        const data = cad.data.findChild(this._prevId);
        if (!data) {
            return;
        }
        const cloneData = data.clone(true);
        const collection = this.status.collection$.value;
        const split = new CadData();
        split.entities = entities.clone(true);
        const node = this._getCadNode(split);
        this.cads.push(node);
        if (collection === "p_yuanshicadwenjian") {
            data.addComponent(split);
        } else {
            // data.separate(split);
            data.addComponent(split);
            this.blur(split.entities);
            cad.remove(entities);
            split.conditions = cloneData.conditions;
            split.options = cloneData.options;
            split.type = cloneData.type;
            try {
                data.directAssemble(split);
            } catch (error) {
                this.message.snack("快速装配失败: " + (error as Error).message);
            }
        }
    }).bind(this);

    private onPointerDown = ((event: PointerEvent) => {
        const {clientX, clientY, shiftKey, button} = event;
        if (this.config.getConfig("dragAxis") !== "" || (button !== 1 && !(shiftKey && button === 0))) {
            return;
        }
        this.lastPointer = new Point(clientX, clientY);
        this.entitiesToMove = new CadEntities();
        this.entitiesNotToMove = new CadEntities();
        const selectedCads = this.status.getFlatSelectedCads();
        selectedCads.forEach((v) => this.entitiesToMove?.merge(v.getAllEntities()));
        const ids: string[] = [];
        this.entitiesToMove.forEach((e) => ids.push(e.id));
        this.status.cad.data.getAllEntities().forEach((e) => {
            if (!ids.includes(e.id)) {
                this.entitiesNotToMove?.add(e);
            }
        });
    }).bind(this);

    private onPointerMove = ((event: PointerEvent) => {
        if (!this.lastPointer) {
            return;
        }
        const {clientX, clientY} = event;
        const cad = this.status.cad;
        const selectedCads = this.status.selectedCads$.value;
        const cadStatus = this.status.cadStatus;
        const pointer = new Point(clientX, clientY);
        const translate = this.lastPointer.sub(pointer).divide(cad.zoom());
        translate.x = -translate.x;
        if (cadStatus instanceof CadStatusAssemble && selectedCads.components.length) {
            const data = cad.data.findChildren(selectedCads.components);
            const parents = keyBy(cad.data.components.data, "id");
            data.forEach((v) => {
                const parent = parents[v.parent];
                parent?.moveComponent(v, translate);
            });
        } else if (this.entitiesToMove && this.entitiesNotToMove) {
            cad.moveEntities(this.entitiesToMove, this.entitiesNotToMove, translate.x, translate.y);
        }
        this.lastPointer.copy(pointer);
    }).bind(this);

    private onPointerUp = (() => {
        if (this.lastPointer) {
            this.lastPointer = null;
            this.status.cad.render();
        }
    }).bind(this);

    constructor(
        private sanitizer: DomSanitizer,
        private config: AppConfigService,
        private status: AppStatusService,
        private dialog: MatDialog,
        private message: MessageService,
        private dataService: CadDataService
    ) {
        super();
    }

    ngOnInit() {
        this.updateList();
        this.subscribe(this.status.openCad$, () => this.updateList());
        this.subscribe(this.status.selectedCads$, () => this.setSelectedCads());
        let prevConfig: Partial<AppConfig> = {};
        let prevDisabledCadTypes: SelectedCadType[] | null = null;
        this.subscribe(this.status.cadStatusEnter$, async (cadStatus) => {
            if (cadStatus instanceof CadStatusSplit) {
                const id = this.status.selectedCads$.value.cads[0];
                let data: CadData | undefined;
                for (const v of this.status.cad.data.components.data) {
                    if (v.id === id) {
                        data = v;
                    } else {
                        v.getAllEntities().forEach((e) => {
                            if (typeof e.info.prevVisible === "boolean") {
                                e.visible = e.info.prevVisible;
                                delete e.info.prevVisible;
                            } else {
                                e.info.prevVisible = e.visible;
                                e.visible = false;
                            }
                        }, true);
                    }
                }
                this._prevId = id;
                if (data) {
                    if (this.status.collection$.value === "p_yuanshicadwenjian") {
                        data.components.data = [];
                    }
                    prevConfig = this.config.setConfig("dragAxis", "xy", {sync: false});
                    prevDisabledCadTypes = this.status.disabledCadTypes$.value;
                    this.status.disabledCadTypes$.next(["partners", "components"]);
                    this.updateList(data.components.data, false);
                }
                return;
            }
        });
        this.subscribe(this.status.cadStatusExit$, async (cadStatus) => {
            if (cadStatus instanceof CadStatusSplit) {
                cad.data.components.data.forEach((v) => {
                    v.getAllEntities().forEach((e) => {
                        if (typeof e.info.prevVisible === "boolean") {
                            e.visible = e.info.prevVisible;
                            delete e.info.prevVisible;
                        } else {
                            e.info.prevVisible = e.visible;
                            e.visible = true;
                        }
                    }, true);
                    return this;
                });
                this.config.setConfig(prevConfig, {sync: false});
                if (prevDisabledCadTypes) {
                    this.status.disabledCadTypes$.next(prevDisabledCadTypes);
                    prevDisabledCadTypes = null;
                }
                if (this.status.collection$.value === "p_yuanshicadwenjian" && this._prevId) {
                    const data = this.status.cad.data.findChild(this._prevId);
                    if (data) {
                        data.components.data = [];
                        this.status.cad.reset();
                    }
                }
                this._prevId = "";
                this.updateList(cad.data.components.data);
            }
        });

        const setConfig = () => {
            const {subCadsMultiSelect} = this.config.getConfig();
            this.multiSelect = subCadsMultiSelect;
        };
        setConfig();
        const sub = this.config.configChange$.subscribe(({isUserConfig}) => {
            if (isUserConfig) {
                setConfig();
                sub.unsubscribe();
            }
        });

        const cad = this.status.cad;
        cad.on("pointerdown", this.onPointerDown);
        cad.on("pointermove", this.onPointerMove);
        cad.on("pointerup", this.onPointerUp);
        window.addEventListener("keydown", this.splitCad);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        cad.off("pointerdown", this.onPointerDown);
        cad.off("pointermove", this.onPointerMove);
        cad.off("pointerup", this.onPointerUp);
        window.removeEventListener("keydown", this.splitCad);
    }

    private _getCadNode(data: CadData, parent?: string) {
        removeCadGongshi(data);
        const node: CadNode = {data, img: imgLoading, checked: false, indeterminate: false, parent};
        setTimeout(() => {
            getCadPreview(node.data).then((img) => {
                node.img = this.sanitizer.bypassSecurityTrustUrl(img) as string;
            });
        }, 0);
        return node;
    }

    private focus(entities = this.status.cad.data.getAllEntities()) {
        entities.forEach((e) => {
            e.selectable = !e.info.isCadGongshi && !(e instanceof CadHatch);
            e.selected = false;
            e.opacity = 1;
        });
    }

    private blur(entities = this.status.cad.data.getAllEntities()) {
        entities.forEach((e) => {
            e.selectable = !e.info.isCadGongshi && !(e instanceof CadHatch);
            e.selected = false;
            e.opacity = 0.3;
        });
    }

    toggleMultiSelect() {
        this.multiSelect = !this.multiSelect;
        this.config.setConfig("subCadsMultiSelect", this.multiSelect);
        if (!this.multiSelect) {
            const selectedCads = this.status.selectedCads$.value;
            const arr = selectedCads.cads.concat(selectedCads.partners, selectedCads.components);
            if (arr.length > 1) {
                if (selectedCads.cads.length >= 1) {
                    selectedCads.cads = [selectedCads.cads[0]];
                    selectedCads.partners = [];
                    selectedCads.components = [];
                } else if (selectedCads.partners.length >= 1) {
                    selectedCads.partners = [selectedCads.partners[0]];
                    selectedCads.components = [];
                } else {
                    selectedCads.components = [selectedCads.components[0]];
                }
            }
            this.status.selectedCads$.next(selectedCads);
        }
    }

    isAllSelected(field: SelectedCadType) {
        const ids1 = this.status.selectedCads$.value[field];
        const ids2 = this[field].map((v) => v.data.id);
        return isEqual(ids1, ids2);
    }

    selectAll(field: SelectedCadType) {
        const selectedCads = this.status.selectedCads$.value;
        selectedCads[field] = this[field].map((v) => v.data.id);
        if (field === "cads") {
            selectedCads.fullCads = selectedCads.cads.slice();
            selectedCads.partners = concat(selectedCads.partners, ...this.cads.map((v) => v.data.partners.map((vv) => vv.id)));
            selectedCads.components = concat(selectedCads.components, ...this.cads.map((v) => v.data.components.data.map((vv) => vv.id)));
        }
        this.status.selectedCads$.next(selectedCads);
    }

    unselectAll(field: SelectedCadType) {
        const selectedCads = this.status.selectedCads$.value;
        selectedCads[field] = [];
        if (field === "cads") {
            selectedCads.fullCads = [];
            selectedCads.partners = [];
            selectedCads.components = [];
        }
        this.status.selectedCads$.next(selectedCads);
    }

    clickCad(field: SelectedCadType, index: number, event?: MatCheckboxChange | boolean | null) {
        if (this.disabled.includes(field)) {
            return;
        }
        const node = this[field][index];
        const id = node.data.id;
        let selectedCads: SelectedCads;
        if (this.multiSelect) {
            selectedCads = this.status.selectedCads$.value;
        } else {
            selectedCads = {cads: [], fullCads: [], components: [], partners: []};
        }
        let checked: boolean;
        if (event instanceof MatCheckboxChange) {
            checked = event.checked;
        } else if (typeof event === "boolean") {
            checked = event;
        } else {
            checked = !node.checked;
        }
        if (field === "cads") {
            const partners = node.data.partners.map((v) => v.id);
            const components = node.data.components.data.map((v) => v.id);
            if (checked) {
                selectedCads.cads.push(id);
                selectedCads.fullCads.push(id);
                selectedCads.partners = selectedCads.partners.concat(partners);
                selectedCads.components = selectedCads.components.concat(components);
            } else {
                pull(selectedCads.cads, id);
                pull(selectedCads.fullCads, id);
                pullAll(selectedCads.partners, partners);
                pullAll(selectedCads.components, components);
            }
        } else {
            const parentId = node.parent || "";
            if (selectedCads.cads.includes(parentId)) {
                if (selectedCads.fullCads.includes(parentId)) {
                    if (!checked) {
                        pull(selectedCads.fullCads, parentId);
                    }
                } else {
                    if (checked) {
                        selectedCads.fullCads.push(parentId);
                    }
                }
            }
            if (checked) {
                selectedCads[field].push(id);
            } else {
                pull(selectedCads[field], id);
            }
        }
        this.status.selectedCads$.next(selectedCads);
    }

    setSelectedCads() {
        const {cads, partners, components, fullCads} = this.status.selectedCads$.value;
        for (const v of this.cads) {
            let checked = false;
            let indeterminate = false;
            if (cads.includes(v.data.id)) {
                if (fullCads.includes(v.data.id)) {
                    checked = true;
                    indeterminate = false;
                } else {
                    checked = false;
                    indeterminate = true;
                }
            }
            v.checked = checked;
            v.indeterminate = indeterminate;
        }
        for (const v of this.partners) {
            v.checked = partners.includes(v.data.id);
        }
        for (const v of this.components) {
            v.checked = components.includes(v.data.id);
        }

        const cad = this.status.cad;
        const count = cads.length + partners.length + components.length;
        if (count === 0) {
            this.focus();
            this.config.setConfig("dragAxis", "xy");
        } else {
            this.blur();
            this.config.setConfig("dragAxis", "");
            this.cads.forEach((v) => {
                if (cads.includes(v.data.id)) {
                    this.focus(v.data.entities);
                }
            });
            this.partners.forEach((v) => {
                if (partners.includes(v.data.id)) {
                    this.focus(v.data.getAllEntities());
                }
            });
            this.components.forEach((v) => {
                if (components.includes(v.data.id)) {
                    this.focus(v.data.getAllEntities());
                }
            });
        }
        cad.render();
    }

    updateList(list?: CadData[], selectFirstNode = true) {
        const cad = this.status.cad;
        if (!list) {
            list = cad.data.components.data;
        }
        const selectedCads = this.status.selectedCads$.value;
        this.cads = [];
        this.partners = [];
        this.components = [];
        for (const d of list) {
            const node = this._getCadNode(d);
            this.cads.push(node);
            for (const dd of d.partners) {
                const node2 = this._getCadNode(dd, d.id);
                this.partners.push(node2);
            }
            for (const dd of d.components.data) {
                this.components.push(this._getCadNode(dd, d.id));
            }
        }
        this.cadsExpanded = this.cads.length > 0;
        this.partnersExpanded = this.partners.length > 0;
        this.componentsExpanded = this.components.length > 0;
        this.status.selectedCads$.next(selectedCads);
        if (this.cads.length && !this.cads[0].checked && selectFirstNode) {
            this.clickCad("cads", 0);
        }
    }

    onContextMenu(event: MouseEvent, data: CadData, field: SelectedCadType) {
        super.onContextMenu(event);
        if (this.disabled.includes(field)) {
            return;
        }
        this.contextMenuCad = {field, data};
    }

    async editChildren(type: "partners" | "components") {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.contextMenuCad.data;
        let checkedItems: string[] = [];
        if (type === "partners") {
            checkedItems = data.partners.map((v) => v.id);
        }
        if (type === "components") {
            checkedItems = data.components.data.map((v) => v.id);
        }
        const qiliao = type === "components" && this.status.collection$.value === "qiliaozuhe";
        const feilei = [
            "铰框",
            "锁框",
            "顶框",
            "边铰料",
            "边锁料",
            "中铰料",
            "中锁料",
            "小铰料",
            "小锁料",
            "锁企料",
            "扇锁企料",
            "示意图",
            "装配示意图"
        ];
        const cads = await openCadListDialog(this.dialog, {
            data: {
                selectMode: "multiple",
                checkedItems,
                options: data.options,
                collection: "cad",
                qiliao,
                search: {
                    _id: {$ne: data.id},
                    分类: {$not: {$in: feilei}}
                }
            }
        });
        const shouldReplace = (cad1: CadData, cad2: CadData) => cad1.id === cad2.id;
        if (Array.isArray(cads)) {
            let childrens: CadData[] | undefined;
            if (type === "partners") {
                childrens = data.partners;
            } else if (type === "components") {
                childrens = data.components.data;
            }
            if (childrens) {
                const timerName = "sub-cads-editChildren";
                timer.start(timerName);
                const positions: ObjectOf<number[]> = {};
                for (const cad of cads) {
                    const length = childrens.length;
                    let shouldPush = true;
                    for (let i = 0; i < length; i++) {
                        if (shouldReplace(childrens[i], cad)) {
                            const {x, y} = removeCadGongshi(childrens[i]).getBoundingRect();
                            positions[childrens[i].id] = [x, y];
                            childrens[i] = cad;
                            shouldPush = false;
                            break;
                        }
                    }
                    if (shouldPush) {
                        setCadData(cad, this.status.project);
                        childrens.push(cad);
                    }
                }
                let timerContent = "";
                if (type === "components") {
                    data.updateComponents();
                    childrens.forEach((v) => {
                        if (v.id in positions) {
                            const {x: x1, y: y1} = v.getBoundingRect();
                            const [x2, y2] = positions[v.id];
                            v.transform({translate: [x2 - x1, y2 - y1]}, true);
                        }
                    });
                    timerContent = "编辑装配CAD";
                } else {
                    timerContent = "编辑关联CAD";
                }
                await this.status.openCad();
                timer.end(timerName, timerContent);
            }
        }
    }

    downloadDxf() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.status.closeCad([this.contextMenuCad.data])[0];
        this.dataService.downloadDxf(data);
    }

    uploadDxf(append: boolean, mainCad: boolean) {
        const el = this.dxfInut.nativeElement;
        el.click();
        if (mainCad) {
            el.setAttribute("main-cad", "");
        } else {
            el.removeAttribute("main-cad");
        }
        if (append) {
            el.setAttribute("append", "");
        } else {
            el.removeAttribute("append");
        }
    }

    async onDxfInutChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!this.contextMenuCad || !file) {
            return;
        }
        const append = input.hasAttribute("append");
        const mainCad = input.hasAttribute("main-cad");
        const data = this.contextMenuCad.data;
        if (append) {
            const resData = await this.dataService.uploadDxf(file);
            if (resData) {
                const rect1 = data.getBoundingRect();
                const rect2 = resData.entities.getBoundingRect();
                const dx = rect1.right + 10 - rect2.left;
                const dy = rect1.y - rect2.y;
                resData.entities.transform({translate: [dx, dy]}, true);
                data.entities.merge(resData.entities);
                data.blocks = resData.blocks;
                this.status.openCad();
            }
        } else {
            const content = `确定要上传<span style="color:red">${file.name}</span>并替换<span style="color:red">${data.name}</span>的数据吗？`;
            const yes = await this.message.confirm(content);
            if (yes) {
                const resData = await this.dataService.uploadDxf(file);
                if (resData) {
                    if (mainCad) {
                        const data1 = new CadData();
                        data1.entities = data.entities;
                        const data2 = new CadData();
                        data2.entities = resData.entities;
                        const {min: min1} = data1.getBoundingRect();
                        const {min: min2} = data2.getBoundingRect();
                        data2.transform({translate: min1.sub(min2)}, true);
                        data.entities = data2.entities;
                    } else {
                        data.entities = resData.entities;
                        data.partners = resData.partners;
                        data.components = resData.components;
                        data.zhidingweizhipaokeng = resData.zhidingweizhipaokeng;
                        data.info = resData.info;
                    }
                    data.blocks = resData.blocks;
                    this.status.openCad();
                }
            }
        }
        input.value = "";
    }

    async getJson() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.status.closeCad([this.contextMenuCad.data])[0];
        await navigator.clipboard.writeText(JSON.stringify(data.export()));
        this.message.snack("内容已复制");
    }

    async setJson() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.contextMenuCad.data;
        const json = await navigator.clipboard.readText();
        if (!json) {
            this.message.alert("内容为空");
            return;
        }
        let obj: any;
        try {
            obj = JSON.parse(json);
        } catch (e) {
            this.message.alert("内容不是有效的JSON");
        }
        obj.id = data.id;
        data.init(obj);
        this.status.openCad();
    }

    async downloadJson() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.status.closeCad([this.contextMenuCad.data])[0];
        downloadByString(JSON.stringify(data.export()), `${data.name}.json`);
    }

    async editJson() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.status.closeCad([this.contextMenuCad.data])[0];
        const result = await openJsonEditorDialog(this.dialog, {data: {json: data.export()}});
        if (result) {
            result.id = this.contextMenuCad.data.id;
            this.contextMenuCad.data.init(result);
            this.status.openCad();
        }
    }

    async deleteSelected(field?: SelectedCadType) {
        let checkedCads: CadData[];
        if (field) {
            checkedCads = this[field].filter((v) => v.checked).map((v) => v.data);
        } else {
            checkedCads = this.cads.filter((v) => v.checked).map((v) => v.data);
        }
        const checkedIds = checkedCads.map((v) => v.id);
        const cadStatus = this.status.cadStatus;
        const cad = this.status.cad;
        if (cadStatus instanceof CadStatusSplit) {
            const collection = this.status.collection$.value;
            if (collection !== "p_yuanshicadwenjian") {
                const data = cad.data.findChild(this._prevId);
                if (data) {
                    checkedCads.forEach((v) => {
                        data.entities.merge(v.getAllEntities());
                    });
                    data.components.data = data.components.data.filter((v) => !checkedIds.includes(v.id));
                }
            }
            this.cads = this.cads.filter((v) => !v.checked);
            this.status.clearSelectedCads();
            cad.render();
        } else {
            const data = cad.data;
            data.components.data = data.components.data.filter((v) => !checkedIds.includes(v.id));
            const toRemove: ObjectOf<{p: string[]; c: string[]}> = {};
            this.partners.forEach((v) => {
                if (v.parent && !checkedIds.includes(v.parent) && v.checked) {
                    if (!toRemove[v.parent]) {
                        toRemove[v.parent] = {p: [], c: []};
                    }
                    toRemove[v.parent].p.push(v.data.id);
                }
            });
            this.components.forEach((v) => {
                if (v.parent && !checkedIds.includes(v.parent) && v.checked) {
                    if (!toRemove[v.parent]) {
                        toRemove[v.parent] = {p: [], c: []};
                    }
                    toRemove[v.parent].c.push(v.data.id);
                }
            });
            if (checkedIds.length || Object.keys(toRemove).length) {
                for (const id in toRemove) {
                    const {p, c} = toRemove[id];
                    const parent = data.components.data.find((v) => v.id === id);
                    if (parent) {
                        parent.partners = parent.partners.filter((v) => !p.includes(v.id));
                        parent.components.data = parent.components.data.filter((v) => !c.includes(v.id));
                    }
                }
                this.status.openCad();
            }
        }
    }

    async replaceData() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.contextMenuCad.data;
        const cads = await openCadListDialog(this.dialog, {data: {selectMode: "single", options: data.options, collection: "cad"}});
        if (cads && cads[0]) {
            this.dataService.replaceData(data, cads[0].id, this.status.collection$.value);
        }
    }
}
