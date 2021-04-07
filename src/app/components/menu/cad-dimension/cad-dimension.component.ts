import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {CadDimension, CadData, CadLine, CadEventCallBack} from "@src/app/cad-viewer";
import {Subscribed} from "@src/app/mixins/subscribed.mixin";
import {AppConfig, AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService, SelectedCads, SelectedCadType} from "@src/app/services/app-status.service";
import {CadStatusEditDimension, CadStatusNormal} from "@src/app/services/cad-status";
import Color from "color";
import {debounce} from "lodash";
import {openCadDimensionFormDialog} from "../../dialogs/cad-dimension-form/cad-dimension-form.component";

@Component({
    selector: "app-cad-dimension",
    templateUrl: "./cad-dimension.component.html",
    styleUrls: ["./cad-dimension.component.scss"]
})
export class CadDimensionComponent extends Subscribed() implements OnInit, OnDestroy {
    dimNameFocus = -1;
    dimLineSelecting = -1;
    dimensions: CadDimension[] = [];
    private prevConfig: AppConfig | null = null;
    private prevDisabledCadTypes: SelectedCadType[] | null = null;
    private prevSelectedCads: SelectedCads | null = null;

    private updateDimensions = (() => {
        this.dimensions = this.status.cad.data.getAllEntities().dimension;
    }).bind(this);

    onEntitiesSelect = (((entities) => {
        const cad = this.status.cad;
        const data = cad.data.components.data;
        const cadStatus = this.status.cadStatus;
        const dimensions = this.dimensions;
        const entity = entities.line[0];
        if (cadStatus instanceof CadStatusEditDimension && entity) {
            let thatData: CadData | undefined;
            let thatIndex = -1;
            cad.data.components.data.some((d, i) => {
                if (d.findEntity(entity.id)) {
                    thatData = d;
                    thatIndex = i;
                    return true;
                }
                return false;
            });
            if (thatIndex < 0 || !thatData) {
                return;
            }
            for (const d of cad.data.components.data) {
                if (d.findEntity(entity.id)) {
                    thatData = d;
                    break;
                }
            }
            let dimension = dimensions[cadStatus.index];
            if (!dimension) {
                dimension = new CadDimension();
                dimension.color = new Color(0x00ff00);
                let newIndex = 0;
                for (let i = 0; i < thatIndex; i++) {
                    newIndex += data[i].entities.dimension.length;
                }
                newIndex += thatData.entities.dimension.push(dimension) - 1;
                this.status.setCadStatus(new CadStatusEditDimension(newIndex));
            }
            if (!dimension.entity1.id) {
                dimension.entity1 = {id: entity.id, location: "start"};
                dimension.cad1 = thatData.name;
            } else if (!dimension.entity2.id) {
                dimension.entity2 = {id: entity.id, location: "end"};
                dimension.cad2 = thatData.name;
            } else {
                dimension.entity1 = dimension.entity2;
                dimension.entity2 = {id: entity.id, location: "end"};
                dimension.cad2 = thatData.name;
            }
            const e1 = cad.data.findEntity(dimension.entity1.id);
            const e2 = cad.data.findEntity(dimension.entity2.id);
            if (e1 instanceof CadLine && e2 instanceof CadLine) {
                const slope1 = e1.slope;
                const slope2 = e2.slope;
                // * default axis: x
                if (Math.abs(slope1 - slope2) <= 1) {
                    if (Math.abs(slope1) <= 1) {
                        dimension.axis = "y";
                    } else {
                        dimension.axis = "x";
                    }
                }
            }
            this.focus(dimension);
            cad.render(dimension);
        }
    }) as CadEventCallBack<"entitiesselect">).bind(this);

    constructor(private status: AppStatusService, private dialog: MatDialog, private config: AppConfigService) {
        super();
    }

    ngOnInit() {
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            if (cadStatus instanceof CadStatusEditDimension) {
                const index = cadStatus.index;
                const dimension = this.dimensions[index];
                this.dimLineSelecting = index;
                if (!this.prevConfig) {
                    this.prevConfig = this.config.config();
                    this.config.config({hideLineLength: true, lineGongshi: 0, selectMode: "single"});
                }
                if (!this.prevSelectedCads) {
                    this.prevSelectedCads = this.status.selectedCads$.value;
                    this.status.clearSelectedCads();
                }
                if (!this.prevDisabledCadTypes) {
                    this.prevDisabledCadTypes = this.status.disabledCadTypes$.value;
                    this.status.disabledCadTypes$.next(["cads", "partners", "components"]);
                }
                this.focus(dimension);
            }
        });
        this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
            if (cadStatus instanceof CadStatusEditDimension) {
                this.dimLineSelecting = -1;
                if (this.prevConfig) {
                    this.config.config(this.prevConfig);
                    this.prevConfig = null;
                }
                if (this.prevSelectedCads) {
                    this.status.selectedCads$.next(this.prevSelectedCads);
                    this.prevSelectedCads = null;
                }
                if (this.prevDisabledCadTypes) {
                    this.status.disabledCadTypes$.next(this.prevDisabledCadTypes);
                    this.prevDisabledCadTypes = null;
                }
                this.blur();
            }
        });

        this.updateDimensions();
        const cad = this.status.cad;
        cad.on("entitiesselect", this.onEntitiesSelect);
        cad.on("entitiesadd", this.updateDimensions);
        cad.on("entitiesremove", this.updateDimensions);
        cad.on("render", this.updateDimensions);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        cad.off("entitiesselect", this.onEntitiesSelect);
        cad.off("entitiesadd", this.updateDimensions);
        cad.off("entitiesremove", this.updateDimensions);
        cad.off("render", this.updateDimensions);
    }

    async editDimension(i: number) {
        const dimensions = this.dimensions;
        const dimension = await openCadDimensionFormDialog(this.dialog, {data: {data: dimensions[i]}, disableClose: true});
        if (dimension) {
            this.status.cad.render();
        }
    }

    getDimensionName(dimension: CadDimension, index: number) {
        if (this.dimNameFocus === index) {
            return dimension.mingzi || "";
        } else {
            return `${dimension.mingzi || ""} ${dimension.qujian || ""}`;
        }
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    setDimensionName = debounce((event: Event, dimension: CadDimension) => {
        const str = (event.target as HTMLInputElement).value;
        dimension.mingzi = str;
        this.status.cad.render(dimension);
    }, 500);

    isSelectingDimLine(i: number) {
        const cadStatus = this.status.cadStatus;
        return cadStatus instanceof CadStatusEditDimension && cadStatus.index === i;
    }

    async selectDimLine(i: number) {
        const cadStatus = this.status.cadStatus;
        if (cadStatus instanceof CadStatusEditDimension && cadStatus.index === i) {
            this.status.setCadStatus(new CadStatusNormal());
        } else {
            this.status.setCadStatus(new CadStatusEditDimension(i));
        }
    }

    addDimension() {
        this.selectDimLine(-1);
    }

    removeDimension(index: number) {
        this.status.cad.remove(this.dimensions[index]);
    }

    focus(dimension?: CadDimension) {
        if (!dimension) {
            return;
        }
        const {entity1, entity2} = dimension;
        this.status.cad.traverse((e) => {
            if (e instanceof CadLine) {
                e.selectable = true;
                e.selected = [entity1?.id, entity2?.id].includes(e.id);
                e.opacity = 1;
            } else if (e.id === dimension.id) {
                e.opacity = 1;
            } else {
                e.info.prevSelectable = e.info.prevSelectable ?? e.selectable;
                e.info.prevOpacity = e.info.prevOpacity ?? e.opacity;
                e.selectable = false;
                e.opacity = 0.3;
            }
        }, true);
    }

    blur() {
        this.status.cad.traverse((e) => {
            if (!(e instanceof CadLine)) {
                e.selectable = e.info.prevSelectable ?? e.selectable;
                e.opacity = e.info.prevOpacity ?? e.opacity;
                delete e.info.prevSelectable;
                delete e.info.prevOpacity;
            }
        }, true);
    }
}
