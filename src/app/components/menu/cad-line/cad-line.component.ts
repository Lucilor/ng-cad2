import {Component, OnInit, OnDestroy} from "@angular/core";
import {ErrorStateMatcher} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {
    CadLine,
    CadData,
    CadLineLike,
    validColors,
    setLinesLength,
    CadViewerConfig,
    CadArc,
    linewidth2lineweight,
    lineweight2linewidth,
    autoFixLine,
    CadEntities
} from "@src/app/cad-viewer";
import {Subscribed} from "@src/app/mixins/subscribed.mixin";
import {CadConsoleService} from "@src/app/modules/cad-console/services/cad-console.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {CadStatusDrawLine, CadStatusMoveLines} from "@src/app/services/cad-status";
import {Point} from "@src/app/utils";
import Color from "color";
import {debounce} from "lodash";
import {ColorEvent} from "ngx-color";
import {openCadLineTiaojianquzhiDialog} from "../../dialogs/cad-line-tjqz/cad-line-tjqz.component";

@Component({
    selector: "app-cad-line",
    templateUrl: "./cad-line.component.html",
    styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent extends Subscribed() implements OnInit, OnDestroy {
    focusedField = "";
    editDiabled = false;
    lineDrawing: {start?: Point; end?: Point; entity?: CadLine; oldEntity?: CadLine} | null = null;
    linesMoving: {start?: Point} | null = null;
    data: CadData | null = null;
    inputErrors: {gongshi: string | false; guanlianbianhuagongshi: string | false} = {
        gongshi: false,
        guanlianbianhuagongshi: false
    };
    gongshiMatcher: ErrorStateMatcher = {
        isErrorState: () => !!this.inputErrors.gongshi
    };
    guanlianbianhuagongshiMatcher: ErrorStateMatcher = {
        isErrorState: () => !!this.inputErrors.guanlianbianhuagongshi
    };
    selected: CadLineLike[] = [];

    get isDrawingLine() {
        return this.status.cadStatus instanceof CadStatusDrawLine;
    }
    get isMovingLines() {
        return this.status.cadStatus instanceof CadStatusMoveLines;
    }
    get cadStatusName() {
        return this.status.cadStatus.name;
    }

    private _colorText = "";
    colorValue = "";
    colorBg = "";
    get colorText() {
        return this._colorText;
    }
    set colorText(value) {
        this._colorText = value.toUpperCase();
        try {
            const c = new Color(value);
            if (c.isLight()) {
                this.colorBg = "black";
            } else {
                this.colorBg = "white";
            }
            this.colorValue = value;
        } catch (error) {
            this.colorValue = "black";
            this.colorBg = "white";
        }
    }

    readonly selectableColors = validColors;

    private onPointerMove = (async ({clientX, clientY, shiftKey}: MouseEvent) => {
        const lineDrawing = this.lineDrawing;
        const cad = this.status.cad;
        if (!lineDrawing) {
            return;
        }
        let entity = lineDrawing.entity;
        if (lineDrawing.oldEntity) {
            if (!entity) {
                return;
            }
            if (lineDrawing.start) {
                entity.start.copy(cad.getWorldPoint(clientX, clientY));
            } else if (lineDrawing.end) {
                entity.end.copy(cad.getWorldPoint(clientX, clientY));
            }
        } else {
            if (!lineDrawing.start) {
                return;
            }
            lineDrawing.end = cad.getWorldPoint(clientX, clientY);
            if (entity) {
                entity.end = lineDrawing.end;
            } else {
                entity = new CadLine({...lineDrawing});
                lineDrawing.entity = entity;
                this.data?.entities.add(entity);
                cad.render(entity);
                entity.opacity = 0.6;
                entity.selectable = false;
            }
        }
        if (shiftKey) {
            const {start, end} = entity;
            const dx = Math.abs(start.x - end.x);
            const dy = Math.abs(start.y - end.y);
            if (dx < dy) {
                end.x = start.x;
            } else {
                end.y = start.y;
            }
        }
        cad.render(entity);
    }).bind(this);

    private onClick = ((_event: MouseEvent) => {
        const lineDrawing = this.lineDrawing;
        const cad = this.status.cad;
        const entity = lineDrawing?.entity;
        if (!lineDrawing || !entity) {
            // this.status.addCadPoint({x: event.clientX, y: event.clientY, active: true});
            return;
        }
        if (lineDrawing.oldEntity) {
        } else {
            setLinesLength(cad.data, [entity], Math.round(entity.length));
            this.addLineDrawing();
        }
    }).bind(this);

    private onEntitiesChange = (() => {
        const {line, arc} = this.status.cad.selected();
        const selected = [...line, ...arc];
        this.selected = selected;
        selected.forEach((e) => {
            if (e instanceof CadLine) {
                ["gongshi", "guanlianbianhuagongshi"].forEach((v) => this.validateLineText(v, e[v as keyof CadLine] as string));
            }
        });
        if (selected.length < 1) {
            this.editDiabled = true;
        } else {
            const cads = this.status.cad.data.components.data;
            const ids: string[] = [];
            cads.forEach((v) => v.entities.forEach((vv) => ids.push(vv.id)));
            this.editDiabled = !selected.every((e) => ids.includes(e.id));
        }
        this.colorText = this.getCssColor();
    }).bind(this);

    private updateCadPoints = (() => {
        const {lineDrawing, linesMoving} = this;
        if (lineDrawing) {
            if (lineDrawing.entity && lineDrawing.oldEntity && !lineDrawing.start && !lineDrawing.end) {
                this.status.setCadPoints(new CadEntities().add(lineDrawing.entity));
            } else {
                this.status.setCadPoints(this.data?.getAllEntities());
            }
        } else if (linesMoving) {
            if (linesMoving.start) {
                const exclude = this.status.getCadPoints(new CadEntities().fromArray(this.selected));
                this.status.setCadPoints(this.data?.getAllEntities(), exclude);
            } else {
                this.status.setCadPoints(new CadEntities().fromArray(this.selected));
            }
        }
    }).bind(this);

    constructor(
        private status: AppStatusService,
        private config: AppConfigService,
        private consoleService: CadConsoleService,
        private dialog: MatDialog,
        private message: MessageService
    ) {
        super();
    }

    ngOnInit() {
        let cad = this.status.cad;
        this.subscribe(this.status.selectedCads$, () => {
            const cads = this.status.getFlatSelectedCads();
            this.data = cads.length === 1 ? cads[0] : null;
        });

        let prevSelectMode: CadViewerConfig["selectMode"];
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            cad = this.status.cad;
            if (cadStatus instanceof CadStatusDrawLine) {
                const selected = this.selected;
                const selected0 = selected[0];
                if (selected.length === 1 && selected0 instanceof CadLine) {
                    this.lineDrawing = {entity: selected0.clone(true), oldEntity: selected0};
                } else {
                    this.lineDrawing = {};
                }
                this.updateCadPoints();
                prevSelectMode = cad.config("selectMode");
                cad.config("selectMode", "none");
                cad.traverse((e) => {
                    e.info.prevSelectable = e.selectable;
                    e.selectable = false;
                });
            } else if (cadStatus instanceof CadStatusMoveLines) {
                const selected = this.selected;
                if (selected.length < 1) {
                    this.message.alert("没有选中线");
                    this.moveLines();
                } else {
                    this.status.setCadPoints(new CadEntities().fromArray(selected));
                    this.linesMoving = {};
                }
            }
        });
        this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
            cad = this.status.cad;
            if (cadStatus instanceof CadStatusDrawLine) {
                const lineDrawing = this.lineDrawing;
                if (lineDrawing) {
                    cad.remove(lineDrawing.entity);
                    if (lineDrawing.oldEntity) {
                        lineDrawing.oldEntity.opacity = 1;
                    }
                }
                cad.traverse((e) => {
                    e.selectable = e.info.prevSelectable ?? true;
                    delete e.info.prevSelectable;
                });
                cad.config("selectMode", prevSelectMode);
                this.lineDrawing = null;
                this.status.setCadPoints();
            } else if (cadStatus instanceof CadStatusMoveLines) {
                this.status.setCadPoints();
                this.linesMoving = null;
            }
        });
        this.subscribe(this.status.cadPoints$, async (cadPoints) => {
            const activePoints = cadPoints.filter((v) => v.active);
            const cadStatus = this.status.cadStatus;
            if (!activePoints.length) {
                return;
            }
            const worldPoints = activePoints.map((v) => cad.getWorldPoint(v.x, v.y));
            const {lineDrawing, linesMoving} = this;
            if (cadStatus instanceof CadStatusDrawLine && lineDrawing) {
                const {entity, oldEntity} = lineDrawing;
                if (oldEntity) {
                    if (!entity) {
                        return;
                    }
                    if (worldPoints.length === 1) {
                        if (!lineDrawing.start && !lineDrawing.end) {
                            if (worldPoints[0].equals(entity.start)) {
                                lineDrawing.start = entity.start;
                            } else {
                                lineDrawing.end = entity.end;
                            }
                            oldEntity.opacity = 0.6;
                            this.updateCadPoints();
                        } else {
                            if (lineDrawing.start) {
                                entity.start.copy(worldPoints[0]);
                            } else {
                                entity.end.copy(worldPoints[0]);
                            }
                            this.data?.entities.add(entity);
                            cad.remove(oldEntity).render(entity);
                            entity.selected = false;
                            lineDrawing.entity = lineDrawing.oldEntity;
                            delete lineDrawing.oldEntity;
                            this.drawLine();
                        }
                    }
                } else {
                    if (worldPoints.length === 1) {
                        lineDrawing.start = worldPoints[0];
                    } else if (entity) {
                        if (worldPoints[0].equals(entity.start)) {
                            entity.end.copy(worldPoints[1]);
                        } else {
                            entity.end.copy(worldPoints[0]);
                        }
                        this.addLineDrawing();
                    }
                }
            } else if (cadStatus instanceof CadStatusMoveLines && linesMoving) {
                if (worldPoints.length === 1) {
                    if (linesMoving.start) {
                        this.moveLines();
                        this.status.setCadPoints();
                        const translate = worldPoints[0].sub(linesMoving.start).toArray();
                        new CadEntities().fromArray(this.selected).transform({translate}, true);
                        this.status.cad.render(this.selected);
                    } else {
                        linesMoving.start = worldPoints[0];
                        this.status.setCadPoints(this.data?.getAllEntities(), cadPoints);
                    }
                }
            }
        });

        this.subscribe(this.status.openCad$, () => {
            this.onEntitiesChange();
        });
        cad.on("pointermove", this.onPointerMove);
        cad.on("click", this.onClick);
        cad.on("entitiesselect", this.onEntitiesChange);
        cad.on("entitiesunselect", this.onEntitiesChange);
        cad.on("entitiesadd", this.onEntitiesChange);
        cad.on("entitiesremove", this.onEntitiesChange);
        cad.on("moveEntities", this.updateCadPoints);
        cad.on("zoom", this.updateCadPoints);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        cad.off("pointermove", this.onPointerMove);
        cad.off("click", this.onClick);
        cad.off("entitiesselect", this.onEntitiesChange);
        cad.off("entitiesunselect", this.onEntitiesChange);
        cad.off("entitiesadd", this.onEntitiesChange);
        cad.off("entitiesremove", this.onEntitiesChange);
        cad.off("moveEntities", this.updateCadPoints);
        cad.off("zoom", this.updateCadPoints);
    }

    getLineLength() {
        const lines = this.selected;
        if (lines.length === 1) {
            const line = lines[0];
            if (line instanceof CadLine) {
                return line.length.toFixed(2);
            } else if (line instanceof CadArc) {
                return line.length.toFixed(2);
            }
        }
        return "";
    }

    setLineLength(event: Event) {
        const {selected} = this;
        const cad = this.status.cad;
        const lines = selected.filter((v) => v instanceof CadLine) as CadLine[];
        setLinesLength(cad.data, lines, Number((event.target as HTMLInputElement).value));
        if (cad.config("validateLines")) {
            this.status.validate();
        }
        cad.render();
    }

    getCssColor() {
        const lines = this.selected;
        if (lines.length === 1) {
            return lines[0].color.hex();
        }
        if (lines.length) {
            const strs = Array.from(new Set(lines.map((l) => l.color.hex())));
            if (strs.length === 1) {
                return strs[0];
            } else {
                return "多个值";
            }
        }
        return "";
    }

    setLineColor(event: ColorEvent) {
        const value = event.color.hex;
        this.colorText = value;
        this.selected.forEach((e) => (e.color = new Color(value)));
        this.status.cad.render();
    }

    getLineText(field: string) {
        const lines = this.selected;
        if (lines.length === 1) {
            return (lines as any)[0][field] ?? ("" as string);
        }
        if (lines.length) {
            const texts = Array.from(new Set(lines.map((l: any) => l[field] as string)));
            if (texts.length === 1) {
                return texts[0];
            }
            return field === this.focusedField ? "" : "多个值";
        }
        return "";
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    setLineText = debounce((event: InputEvent | MatSelectChange | Event, field: string) => {
        let value: number | string = "";
        if (event instanceof MatSelectChange) {
            value = event.value;
        } else if (event instanceof InputEvent || event instanceof Event) {
            const target = event.target as HTMLInputElement;
            if (target.type === "number") {
                value = Number(target.value);
            } else {
                value = target.value;
            }
        }
        if (field === "zhewanValue" && value < 0) {
            this.message.alert("指定折弯标记位置不能小于0");
            value = 0;
        }
        if (this.validateLineText(field, value)) {
            this.selected.forEach((e) => {
                (e as any)[field] = value;
                if (["mingzi", "gongshi", "guanlianbianhuagongshi", "lengthTextSize"].includes(field)) {
                    this.status.cad.render(e);
                }
            });
        }
    }, 500);

    validateLineText(field: string, value: string | number) {
        value = value.toString();
        if (field === "gongshi") {
            if (this.config.config("collection") === "cad" && value.match(/[-+*/()（）]/)) {
                this.inputErrors.gongshi = "不能使用四则运算";
                return false;
            } else if (value.includes("变化值")) {
                this.inputErrors.gongshi = "公式不能包含变化值";
                return false;
            } else {
                this.inputErrors.gongshi = false;
            }
        } else if (field === "guanlianbianhuagongshi") {
            if (value && !value.includes("变化值")) {
                this.inputErrors.guanlianbianhuagongshi = "关联变化公式必须包含变化值";
                return false;
            } else {
                this.inputErrors.guanlianbianhuagongshi = false;
            }
        }
        return true;
    }

    getLinewidth() {
        const lines = this.selected;
        if (lines.length === 1) {
            return linewidth2lineweight(lines[0].linewidth).toString();
        }
        if (lines.length) {
            const texts = Array.from(new Set(lines.map((l) => l.linewidth)));
            if (texts.length === 1) {
                return linewidth2lineweight(texts[0]).toString();
            }
            return "多个值";
        }
        return "";
    }

    setLinewidth(event: Event) {
        this.selected.forEach((entity) => {
            const width = Number((event.target as HTMLInputElement).value);
            entity.linewidth = lineweight2linewidth(width);
        });
        this.status.cad.render();
    }

    drawLine() {
        this.status.toggleCadStatus(new CadStatusDrawLine());
    }

    moveLines() {
        // this.status.setCadPoints(generatePointsMap(new CadEntities().fromArray(this.selected)));
        this.status.toggleCadStatus(new CadStatusMoveLines());
    }

    addLineDrawing() {
        const lineDrawing = this.lineDrawing;
        const entity = lineDrawing?.entity;
        if (!lineDrawing || !entity) {
            return;
        }
        this.status.cad.render(entity);
        entity.opacity = 1;
        entity.selectable = true;
        delete lineDrawing.entity;
        delete lineDrawing.start;
        delete lineDrawing.end;
        this.status.setCadPoints(this.data?.getAllEntities());
    }

    autoFix() {
        const {selected} = this;
        const cad = this.status.cad;
        selected.forEach((e) => {
            if (e instanceof CadLine) {
                autoFixLine(cad, e);
            }
        });
        if (cad.config("validateLines")) {
            this.status.validate();
        }
        cad.render();
    }

    async editTiaojianquzhi() {
        const lines = this.selected.filter((v) => v instanceof CadLine) as CadLine[];
        if (lines.length < 1) {
            this.message.alert("请先选中一条直线");
        } else if (lines.length > 1) {
            this.message.alert("无法同时编辑多根线的条件取值");
        } else {
            openCadLineTiaojianquzhiDialog(this.dialog, {data: lines[0]});
        }
    }

    getHideLength() {
        return this.selected.some((v) => v.hideLength);
    }

    setHideLength(event: MatSlideToggleChange) {
        this.selected.forEach((v) => (v.hideLength = event.checked));
        this.status.cad.render(this.selected);
    }
}
