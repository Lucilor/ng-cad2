import {Component, OnInit, OnDestroy} from "@angular/core";
import {CadData, CadEventCallBack, CadEntity, CadConnection} from "@cad-viewer";
import {Subscribed} from "@mixins/subscribed.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService, AppConfig} from "@services/app-config.service";
import {AppStatusService, SelectedCads, SelectedCadType} from "@services/app-status.service";
import {CadStatusAssemble} from "@services/cad-status";
import {difference} from "lodash";

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
    data = new CadData();

    get connections() {
        return this.data.components.connections;
    }

    private _onEntitiesSelect = (((entities, multi) => {
        const cadStatus = this.status.cadStatus;
        if (!(cadStatus instanceof CadStatusAssemble)) {
            return;
        }
        const cad = this.status.cad;
        const data = cad.data.components.data[cadStatus.index];
        const selected = cad.selected().toArray();
        const ids = selected.map((e) => e.id);
        if (multi) {
            data.components.data.forEach((v) => {
                for (const e of v.getAllEntities().toArray()) {
                    if (ids.includes(e.id)) {
                        const selectedCads = this.status.selectedCads$.value;
                        if (selectedCads.components.includes(v.id)) {
                            selectedCads.components = selectedCads.components.filter((vv) => vv !== v.id);
                        } else {
                            selectedCads.components.push(v.id);
                        }
                        this.status.selectedCads$.next(selectedCads);
                        break;
                    }
                }
            });
        } else {
            this._selectEntity(entities.toArray()[0]);
        }
    }) as CadEventCallBack<"entitiesselect">).bind(this);

    private _onEntitiesUnselect = (((entities) => {
        const ids = entities.toArray().map((v) => v.id);
        this.lines = difference(this.lines, ids);
    }) as CadEventCallBack<"entitiesunselect">).bind(this);

    private _selectEntity(entity: CadEntity) {
        const cadStatus = this.status.cadStatus;
        if (!(cadStatus instanceof CadStatusAssemble) || !entity) {
            return;
        }
        const cad = this.status.cad;
        const data = this.data;
        const dumpComponent = new CadData({id: data.id, name: data.name});
        dumpComponent.entities = data.entities;
        data.partners.forEach((v) => {
            dumpComponent.entities.merge(v.getAllEntities());
        });
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
                            this.message.alert(error.message);
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
    }

    constructor(private config: AppConfigService, private status: AppStatusService, private message: MessageService) {
        super();
    }

    ngOnInit() {
        this.subscribe(this.status.selectedCads$, (selectedCads) => {
            const data = this.status.cad.data.findChild(selectedCads.cads[0]);
            if (data) {
                this.data = data;
            }
        });
        let prevConfig: Partial<AppConfig> = {};
        let prevSelectedCads: SelectedCads | null = null;
        let prevDisabledCadTypes: SelectedCadType[] | null = null;
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            if (cadStatus instanceof CadStatusAssemble) {
                const data = this.status.cad.data.components.data[cadStatus.index];
                prevConfig = this.config.setConfig({selectMode: "multiple"}, {sync: false});
                prevDisabledCadTypes = this.status.disabledCadTypes$.value;
                this.status.disabledCadTypes$.next(["cads", "partners"]);
                prevSelectedCads = this.status.selectedCads$.value;
                this.status.selectedCads$.next({cads: [data.id], partners: [], components: [], fullCads: [data.id]});
                this.status.cad.data.updateComponents();
            }
        });
        this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
            if (cadStatus instanceof CadStatusAssemble) {
                this.config.setConfig(prevConfig, {sync: false});
                if (prevDisabledCadTypes) {
                    this.status.disabledCadTypes$.next(prevDisabledCadTypes);
                    this.prevDisabledCadTypes = null;
                }
                if (prevSelectedCads) {
                    this.status.selectedCads$.next(prevSelectedCads);
                    this.prevSelectedCads = null;
                }
            }
        });

        const cad = this.status.cad;
        cad.on("entitiesselect", this._onEntitiesSelect);
        cad.on("entitiesunselect", this._onEntitiesUnselect);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        cad.off("entitiesselect", this._onEntitiesSelect);
        cad.off("entitiesunselect", this._onEntitiesUnselect);
    }

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
                this.message.alert(error);
            }
        });
        this.status.cad.render();
    }
}
