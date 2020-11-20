import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog} from "@angular/material/dialog";
import {MatMenuTrigger} from "@angular/material/menu";
import {MatSnackBar} from "@angular/material/snack-bar";
import {DomSanitizer} from "@angular/platform-browser";
import {CadCollection, imgLoading} from "@src/app/app.common";
import {CadData, CadEntities, CadHatch} from "@src/app/cad-viewer";
import {getCadPreview, removeCadGongshi} from "@src/app/cad.utils";
import {ContextMenu} from "@src/app/mixins/ContextMenu.mixin";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService, CadStatus, SelectedCads, SelectedCadType} from "@src/app/services/app-status.service";
import {copyToClipboard, Point} from "@src/app/utils";
import {concat, differenceWith, pull, pullAll} from "lodash";
import {openCadListDialog} from "../../dialogs/cad-list/cad-list.component";
import {openJsonEditorDialog} from "../../dialogs/json-editor/json-editor.component";

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
    needsReload: CadStatus["name"] | null = null;
    @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;
    @ViewChild("dxfInut", {read: ElementRef}) dxfInut?: ElementRef<HTMLElement>;
    contextMenuCad?: {field: SelectedCadType; data: CadData};
    private _prevId = "";
    private lastPointer: Point | null = null;
    private entitiesToMove?: CadEntities;
    private entitiesNotToMove?: CadEntities;
    private updateListLock = false;
    private prevConfig: AppConfig | null = null;
    private prevDisabledCadTypes: SelectedCadType[] | null = null;

    get selected() {
        const cads = this.cads.filter((v) => v.checked).map((v) => v.data);
        const partners = this.partners.filter((v) => v.checked).map((v) => v.data);
        const components = this.components.filter((v) => v.checked).map((v) => v.data);
        return {cads, partners, components};
    }

    get disabled() {
        return this.status.disabledCadTypes$.getValue();
    }
    set disabled(value) {
        this.status.disabledCadTypes$.next(value);
    }

    private splitCad = (({key}: KeyboardEvent) => {
        if (key !== "Enter") {
            return;
        }
        const {name, extra} = this.status.cadStatus();
        if (name !== "split") {
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
        const collection = extra.collection as CadCollection;
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
                this.snackBar.open("快速装配失败: " + (error as Error).message);
            }
        }
    }).bind(this);

    private onPointerDown = ((event: PointerEvent) => {
        const {clientX, clientY, shiftKey, button} = event;
        if (this.config.config("dragAxis") !== "" || (button !== 1 && !(shiftKey && button === 0))) {
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
        const selectedCads = this.status.selectedCads$.getValue();
        const name = this.status.cadStatus("name");
        const pointer = new Point(clientX, clientY);
        const translate = this.lastPointer.sub(pointer).divide(cad.zoom());
        translate.x = -translate.x;
        if (name === "assemble" && selectedCads.components.length) {
            const parent = cad.data.findChild(selectedCads.cads[0]);
            const data = cad.data.findChildren(selectedCads.components);
            if (parent) {
                data.forEach((v) => parent.moveComponent(v, translate));
            }
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
        private snackBar: MatSnackBar,
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
        this.subscribe(this.status.cadStatus$, async (cadStatus) => {
            if (cadStatus.name === "split") {
                const id = this.status.selectedCads$.getValue().cads[0];
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
                if (data && this.config.config("collection") === "p_yuanshicadwenjian") {
                    data.components.data = [];
                }
                if (!this.prevConfig) {
                    this.prevConfig = this.config.config();
                    this.config.config("dragAxis", "xy");
                }
                if (!this.prevDisabledCadTypes) {
                    this.prevDisabledCadTypes = this.status.disabledCadTypes$.getValue();
                    this.status.disabledCadTypes$.next(["partners", "components"]);
                }
                this.updateList();
                return;
            } else if (this._prevId) {
                this.status.cad.data.components.data.forEach((v) => {
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
                if (this.prevConfig) {
                    this.config.config(this.prevConfig);
                    this.prevConfig = null;
                }
                if (this.prevDisabledCadTypes) {
                    this.status.disabledCadTypes$.next(this.prevDisabledCadTypes);
                    this.prevDisabledCadTypes = null;
                }
                if (this.config.config("collection") === "p_yuanshicadwenjian" && this._prevId) {
                    const data = this.status.cad.data.findChild(this._prevId);
                    if (data) {
                        data.components.data = [];
                        this.status.cad.reset();
                    }
                }
                this._prevId = "";
                this.updateList();
            }
        });
        // this.status.cad.on("render", debounce((() => this.updateList()).bind(this), 1000));

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
        // const img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(data)) as string;
        const node: CadNode = {data, img: imgLoading, checked: false, indeterminate: false, parent};
        getCadPreview(data).then((img) => (node.img = this.sanitizer.bypassSecurityTrustUrl(img) as string));
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
        if (!this.multiSelect) {
            const selectedCads = this.status.selectedCads$.getValue();
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

    selectAll(field: SelectedCadType = "cads") {
        const selectedCads = this.status.selectedCads$.getValue();
        selectedCads[field] = this[field].map((v) => v.data.id);
        if (field === "cads") {
            selectedCads.fullCads = selectedCads.cads.slice();
            selectedCads.partners = concat(selectedCads.partners, ...this.cads.map((v) => v.data.partners.map((v) => v.id)));
            selectedCads.components = concat(selectedCads.components, ...this.cads.map((v) => v.data.components.data.map((v) => v.id)));
        }
        this.status.selectedCads$.next(selectedCads);
    }

    unselectAll(field: SelectedCadType = "cads") {
        const selectedCads = this.status.selectedCads$.getValue();
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
            selectedCads = this.status.selectedCads$.getValue();
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
        const {cads, partners, components, fullCads} = this.status.selectedCads$.getValue();
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
            this.config.config("dragAxis", "xy");
        } else {
            this.blur();
            this.config.config("dragAxis", "");
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

    updateList(list?: CadData[]) {
        if (this.updateListLock) {
            return;
        }
        this.updateListLock = true;
        const cad = this.status.cad;
        const statusName = this.status.cadStatus("name");
        if (!list) {
            if (statusName === "split") {
                list = cad.data.components.data.find((v) => v.id === this._prevId)?.components.data || [];
            } else {
                list = cad.data.components.data;
            }
        }
        this.cads = [];
        this.partners = [];
        this.components = [];
        for (const d of list) {
            const node = this._getCadNode(d);
            this.cads.push(node);
            for (const dd of d.partners) {
                const node = this._getCadNode(dd, d.id);
                this.partners.push(node);
            }
            for (const dd of d.components.data) {
                const node = this._getCadNode(dd, d.id);
                this.components.push(node);
            }
        }
        this.status.clearSelectedCads();
        if (this.cads.length) {
            this.clickCad("cads", 0);
        }
        this.updateListLock = false;
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
        let checkedItems: CadData[] = [];
        if (type === "partners") {
            checkedItems = [...data.partners];
        }
        if (type === "components") {
            checkedItems = [...data.components.data];
        }
        const qiliao = type === "components" && this.config.config("collection") === "qiliaozuhe";
        const cads = await openCadListDialog(this.dialog, {
            data: {selectMode: "multiple", checkedItems, options: data.options, collection: "cad", qiliao}
        });
        const shouldReplace = (cad1: CadData, cad2: CadData) => {
            return (
                cad1.name === cad2.name &&
                differenceWith(cad1.options, cad2.options, (a, b) => {
                    return a.equals(b);
                }).length === 0
            );
        };
        if (Array.isArray(cads)) {
            let childrens: CadData[] | undefined;
            if (type === "partners") {
                childrens = data.partners;
            } else if (type === "components") {
                childrens = data.components.data;
            }
            if (childrens) {
                for (let i = 0; i < cads.length; i++) {
                    if (childrens.length) {
                        for (let j = 0; j < childrens.length; j++) {
                            if (shouldReplace(childrens[j], cads[i])) {
                                childrens[j] = cads[i];
                                break;
                            } else if (j === childrens.length - 1) {
                                childrens.push(cads[i]);
                            }
                        }
                    } else {
                        childrens.push(cads[i]);
                    }
                }
            }
            this.status.openCad();
        }
    }

    downloadDxf() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.contextMenuCad.data.clone();
        removeCadGongshi(data);
        this.dataService.downloadDxf(data);
    }

    uploadDxf(mainCad = false) {
        if (!this.dxfInut) {
            return;
        }
        const el = this.dxfInut.nativeElement;
        el.click();
        if (mainCad) {
            el.setAttribute("main-cad", "");
        } else {
            el.removeAttribute("main-cad");
        }
    }

    async onDxfInutChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!this.contextMenuCad || !file) {
            return;
        }
        const data = this.contextMenuCad.data;
        const content = `确定要上传<span style="color:red">${file.name}</span>并替换<span style="color:red">${data.name}</span>的数据吗？`;
        const yes = await this.message.confirm(content);
        if (yes) {
            const resData = await this.dataService.uploadDxf(file);
            if (resData) {
                if (input.hasAttribute("main-cad")) {
                    const data1 = new CadData();
                    data1.entities = data.entities;
                    const data2 = new CadData();
                    data2.entities = resData.entities;
                    const {min: min1} = data1.getBoundingRect();
                    const {min: min2} = data2.getBoundingRect();
                    data2.transform({translate: min1.sub(min2)});
                    data.entities = data2.entities;
                } else {
                    data.entities = resData.entities;
                    data.partners = resData.partners;
                    data.components = resData.components;
                }
                this.status.openCad();
            }
        }
        input.value = "";
    }

    getJson() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.contextMenuCad.data.clone();
        removeCadGongshi(data);
        copyToClipboard(JSON.stringify(data.export()));
        this.snackBar.open("内容已复制");
        console.log(data);
    }

    async setJson() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.contextMenuCad.data.clone();
        removeCadGongshi(data);
        const result = await openJsonEditorDialog(this.dialog, {data: {json: data.export()}});
        if (result) {
            this.contextMenuCad.data.copy(new CadData(result));
            this.status.openCad();
        }
    }

    async deleteSelected() {
        const checkedCads = this.cads.filter((v) => v.checked).map((v) => v.data);
        const checkedIds = checkedCads.map((v) => v.id);
        const {name, extra} = this.status.cadStatus$.getValue();
        const cad = this.status.cad;
        if (name === "split") {
            const collection = extra.collection as CadCollection;
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
            this.config.config({cadIds: data.components.data.map((v) => v.id)});
            const toRemove: {[key: string]: {p: string[]; c: string[]}} = {};
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
                this.updateList();
                cad.reset();
            }
        }
    }

    editSelected() {
        const selected = this.selected;
        let ids = [];
        if (selected.cads.length) {
            ids = selected.cads.map((v) => v.id);
        } else {
            ids = selected.partners.concat(selected.components).map((v) => v.id);
        }
        if (ids.length) {
            open(`index?ids=${ids.join(",")}&collection=cad`);
        }
    }

    async replaceData() {
        if (!this.contextMenuCad) {
            return;
        }
        const data = this.contextMenuCad.data;
        const cads = await openCadListDialog(this.dialog, {data: {selectMode: "single", options: data.options, collection: "cad"}});
        if (cads && cads[0]) {
            this.dataService.replaceData(data, cads[0].id);
        }
    }
}
