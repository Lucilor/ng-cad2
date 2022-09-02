import {Component, OnInit, OnDestroy} from "@angular/core";
import {CadData, CadEventCallBack, CadEntity, CadConnection, CadLine} from "@cad-viewer";
import {Subscribed} from "@mixins/subscribed.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService, AppConfig} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusAssemble} from "@services/cad-status";
import {difference} from "lodash";
import {CadImage} from "src/cad-viewer/src/cad-data/cad-entity/cad-image";

@Component({
    selector: "app-cad-assemble",
    templateUrl: "./cad-assemble.component.html",
    styleUrls: ["./cad-assemble.component.scss"]
})
export class CadAssembleComponent extends Subscribed() implements OnInit, OnDestroy {
    options = {space: "0", position: "absolute"};
    ids: string[] = [];
    names: string[] = [];
    lines: string[] = [];
    get data() {
        return this.status.cad.data;
    }
    get connections() {
        return this.data.components.connections;
    }

    constructor(private config: AppConfigService, private status: AppStatusService, private message: MessageService) {
        super();
    }

    ngOnInit() {
        let prevConfig: Partial<AppConfig> = {};
        let prevSelectedComponents: CadData[] | null = null;
        let prevComponentsSelectable: boolean | null = null;
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            if (cadStatus instanceof CadStatusAssemble) {
                const cad = this.status.cad;
                prevConfig = this.config.setConfig({selectMode: "multiple", entityDraggable: []}, {sync: false});
                prevSelectedComponents = this.status.components.selected$.value;
                this.status.components.selected$.next([]);
                prevComponentsSelectable = this.status.components.selectable$.value;
                this.status.components.selectable$.next(true);
                this._leftTopArr = [];
                if (this.status.collection$.value === "CADmuban") {
                    const data = cad.data;
                    const {top, bottom, left, right} = data.entities.getBoundingRect();
                    const y = top - (top - bottom) / 4;
                    let hasTop = false;
                    let hasBottom = false;
                    let hasLeft = false;
                    let hasRight = false;
                    data.entities.forEach((e) => {
                        if (!(e instanceof CadLine) || e.length < 1000) {
                            if (e instanceof CadLine && e.minY <= y) {
                                return;
                            }
                            const {top: top2, bottom: bottom2, left: left2, right: right2} = e.boundingRect;
                            if (top2 >= top && !hasTop) {
                                hasTop = true;
                                return;
                            }
                            if (bottom2 <= bottom && !hasBottom) {
                                hasBottom = true;
                                return;
                            }
                            if (left2 <= left && !hasLeft) {
                                hasLeft = true;
                                return;
                            }
                            if (right2 >= right && !hasRight) {
                                hasRight = true;
                                return;
                            }
                            e.info.prevVisible = e.visible;
                            e.visible = false;
                            cad.render(e);
                        }
                        if (e.layer === "分页线") {
                            e.calcBoundingRect = false;
                        }
                    });
                }
            }
        });
        this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
            if (cadStatus instanceof CadStatusAssemble) {
                const cad = this.status.cad;
                this.config.setConfig(prevConfig, {sync: false});
                if (prevSelectedComponents !== null) {
                    this.status.components.selected$.next(prevSelectedComponents);
                    prevSelectedComponents = null;
                }
                if (prevComponentsSelectable !== null) {
                    this.status.components.selectable$.next(prevComponentsSelectable);
                    prevComponentsSelectable = null;
                }
                cad.data.entities.forEach((e) => {
                    if (!(e instanceof CadLine) || e.length < 1000) {
                        e.visible = e.info.prevVisible ?? true;
                        delete e.info.prevVisible;
                        cad.render(e);
                    }
                });
            }
        });

        {
            const cad = this.status.cad;
            cad.on("entitiesselect", this._onEntitiesSelect);
            cad.on("entitiesunselect", this._onEntitiesUnselect);
        }
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        cad.off("entitiesselect", this._onEntitiesSelect);
        cad.off("entitiesunselect", this._onEntitiesUnselect);
    }

    private _onEntitiesSelect: CadEventCallBack<"entitiesselect"> = (entities, multi) => {
        const cadStatus = this.status.cadStatus;
        if (!(cadStatus instanceof CadStatusAssemble)) {
            return;
        }
        const cad = this.status.cad;
        const data = this.data;
        const selected = cad.selected().toArray();
        const ids = selected.map((e) => e.id);
        if (multi || (selected.length === 1 && selected[0] instanceof CadImage)) {
            data.components.data.forEach((v) => {
                if (ids.some((id) => v.findEntity(id))) {
                    const selectedComponents = this.status.components.selected$.value;
                    if (selectedComponents.some((vv) => vv.id === v.id)) {
                        this.status.components.selected$.next(selectedComponents.filter((vv) => vv.id !== v.id));
                    } else {
                        this.status.components.selected$.next([...selectedComponents, v]);
                    }
                }
            });
        } else {
            this._selectEntity(entities.toArray()[0]);
        }
    };

    private _onEntitiesUnselect: CadEventCallBack<"entitiesunselect"> = (entities) => {
        const ids = entities.toArray().map((v) => v.id);
        this.lines = difference(this.lines, ids);
    };

    private _selectEntity = (entity: CadEntity) => {
        const cadStatus = this.status.cadStatus;
        if (!(cadStatus instanceof CadStatusAssemble) || !entity) {
            return;
        }
        const cad = this.status.cad;
        const data = this.data;
        const dumpComponent = new CadData({id: data.id, name: data.name});
        dumpComponent.entities = data.entities;
        for (const component of [...data.components.data, dumpComponent]) {
            const {ids, lines, names} = this;
            const found = component.findEntity(entity.id);
            if (found) {
                const prev = ids.findIndex((id) => id === component.id);
                const {space, position} = this.options;
                if (entity.selected) {
                    if (position === "absolute") {
                        if (prev > -1) {
                            const found2 = cad.data.findEntity(lines[prev]);
                            if (found2) {
                                found2.selected = false;
                            }
                            lines[prev] = found.id;
                        } else {
                            ids.push(component.id);
                            names.push(component.name);
                            lines.push(found.id);
                        }
                    }
                    if (position === "relative") {
                        if (prev > -1) {
                            if (prev === 0) {
                                lines.push(found.id);
                                if (lines.length > 2) {
                                    lines.shift();
                                }
                            } else {
                                lines[prev] = found.id;
                            }
                        } else {
                            ids.push(component.id);
                            names.push(component.name);
                            lines.push(found.id);
                        }
                        lines.forEach((l) => {
                            const e = data.findEntity(l);
                            if (e) {
                                e.selected = true;
                            }
                        });
                    }
                    if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
                        try {
                            data.assembleComponents(new CadConnection({ids, names, lines, space, position}));
                            cad.render();
                        } catch (error) {
                            this.message.alert({content: error});
                        } finally {
                            ids.length = 0;
                            names.length = 0;
                            lines.length = 0;
                            cad.unselectAll();
                        }
                    }
                } else if (prev > -1) {
                    if (position === "relative") {
                        if (prev === 0) {
                            const idx = lines.findIndex((l) => l === found.id);
                            lines.splice(idx, -1);
                            if (lines.length < 1) {
                                ids.splice(prev, 1);
                            }
                        } else {
                            ids.splice(prev, 1);
                            lines.splice(prev + 1, 1);
                        }
                    } else {
                        ids.splice(prev, 1);
                        lines.splice(prev, 1);
                    }
                }
                break;
            }
        }
    };

    clearConnections() {
        this.connections.length = 0;
    }

    removeConnection(index: number) {
        this.connections.splice(index, 1);
    }

    directAssemble() {
        const data = this.data;
        data.components.data.forEach((v) => {
            try {
                data.directAssemble(v);
            } catch (error) {
                this.message.alert({content: error});
            }
        });
        this.status.cad.render();
    }
}
