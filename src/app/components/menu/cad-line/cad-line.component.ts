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
    generatePointsMap,
    CadViewerConfig,
    CadArc,
    linewidth2lineweight,
    lineweight2linewidth,
    autoFixLine
} from "@src/app/cad-viewer";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {CadConsoleService} from "@src/app/modules/cad-console/services/cad-console.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService} from "@src/app/services/app-status.service";
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
    lineDrawing: {start?: Point; end?: Point; entity?: CadLine} = {};
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

    get cadStatusName() {
        return this.status.cadStatus("name");
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
        const {lineDrawing} = this;
        const cad = this.status.cad;
        if (!lineDrawing.start) {
            return;
        }
        lineDrawing.end = cad.getWorldPoint(clientX, clientY);
        if (shiftKey) {
            const dx = Math.abs(lineDrawing.start.x - lineDrawing.end.x);
            const dy = Math.abs(lineDrawing.start.y - lineDrawing.end.y);
            if (dx < dy) {
                lineDrawing.end.x = lineDrawing.start.x;
            } else {
                lineDrawing.end.y = lineDrawing.start.y;
            }
        }
        let entity = lineDrawing.entity;
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
        cad.render(entity);
    }).bind(this);

    private onClick = ((_event: MouseEvent) => {
        const {lineDrawing} = this;
        const cad = this.status.cad;
        const entity = lineDrawing.entity;
        if (!entity) {
            // this.status.addCadPoint({x: event.clientX, y: event.clientY, active: true});
            return;
        }
        setLinesLength(cad.data, [entity], Math.round(entity.length));
        this.addLineDrawing();
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

    constructor(
        private status: AppStatusService,
        private config: AppConfigService,
        private console: CadConsoleService,
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
        this.subscribe(this.status.cadStatus$, (cadStatus) => {
            const name = cadStatus.name;
            const {data} = this;
            cad = this.status.cad;
            if (name === "drawLine") {
                this.status.setCadPoints(generatePointsMap(data?.getAllEntities()));
                cad.traverse((e) => {
                    e.info.prevSelectable = e.selectable;
                    e.selectable = false;
                });
                prevSelectMode = cad.config("selectMode");
                cad.config("selectMode", "none");
                this.lineDrawing = {};
            } else {
                this.status.setCadPoints([]);
                cad.remove(this.lineDrawing.entity);
                cad.traverse((e) => {
                    e.selectable = e.info.prevSelectable ?? true;
                    delete e.info.prevSelectable;
                });
                cad.config("selectMode", prevSelectMode);
                if (this.lineDrawing.entity) {
                    this.lineDrawing.entity.selectable = true;
                }
                this.lineDrawing = {};
            }
        });
        this.subscribe(this.status.cadPoints$, (cadPoints) => {
            const activePoints = cadPoints.filter((v) => v.active);
            const name = this.status.cadStatus("name");
            if (!activePoints.length || name !== "drawLine") {
                return;
            }
            const worldPoints = activePoints.map((v) => cad.getWorldPoint(v.x, v.y));
            const entity = this.lineDrawing.entity;
            if (activePoints.length === 1) {
                this.lineDrawing = {start: worldPoints[0]};
            } else if (entity) {
                if (worldPoints[0].equals(entity.start)) {
                    entity.end.copy(worldPoints[1]);
                } else {
                    entity.end.copy(worldPoints[0]);
                }
                this.addLineDrawing();
            }
            // this.status.setCadPoints([]);
        });

        this.onEntitiesChange();
        cad.on("pointermove", this.onPointerMove);
        cad.on("click", this.onClick);
        cad.on("entitiesselect", this.onEntitiesChange);
        cad.on("entitiesunselect", this.onEntitiesChange);
        cad.on("entitiesadd", this.onEntitiesChange);
        cad.on("entitiesremove", this.onEntitiesChange);
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
            return (lines as any)[0][field] as string;
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
        let value = "";
        if (event instanceof MatSelectChange) {
            value = event.value;
        } else if (event instanceof InputEvent || event instanceof Event) {
            value = (event.target as HTMLInputElement).value;
        }
        if (this.validateLineText(field, value)) {
            this.selected.forEach((e) => {
                if (field === "lengthTextSize") {
                    e[field] = Number(value);
                    this.status.cad.render(e);
                } else {
                    if (e instanceof CadLine) {
                        if (field === "zidingzhankaichang") {
                            e[field] = Number(value);
                        } else {
                            (e as any)[field] = value;
                            if (["mingzi", "gongshi", "guanlianbianhuagongshi"].includes(field)) {
                                this.status.cad.render(e);
                            }
                        }
                    }
                }
            });
        }
    }, 500);

    validateLineText(field: string, value: string) {
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
        this.console.execute("draw-line");
    }

    addLineDrawing() {
        const entity = this.lineDrawing.entity;
        if (!entity) {
            return;
        }
        this.status.cad.render(entity);
        entity.opacity = 1;
        entity.selectable = true;
        this.lineDrawing = {};
        this.status.setCadPoints(generatePointsMap(this.data?.getAllEntities()));
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
