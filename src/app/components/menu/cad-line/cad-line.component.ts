import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {ErrorStateMatcher} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {autoFixLine, validColors} from "@app/cad.utils";
import {
    CadArc,
    CadEntities,
    CadEventCallBack,
    CadLine,
    CadLineLike,
    CadViewerConfig,
    ColoredObject,
    DEFAULT_DASH_ARRAY,
    generateLineTexts,
    lineweight2linewidth,
    linewidth2lineweight,
    PointsMap,
    企料位置识别,
    变化方式
} from "@cad-viewer";
import {openCadLineTiaojianquzhiDialog} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {CadPoints, AppStatusService} from "@services/app-status.service";
import {CadStatusDrawLine, CadStatusMoveLines, CadStatusCutLine, CadStatusIntersection} from "@services/cad-status";
import {Point} from "@utils";
import {debounce, uniq} from "lodash";
import {ColorEvent} from "ngx-color";

const cadStatusIntersectionInfo = "addWHDashedLines";

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
    linesCutting: {lines: CadLine[]; points: Point[]} | null = null;
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
    bhfs = 变化方式;
    zhewan = [1, 3];
    WHDashedLines: {line: CadLineLike; map: PointsMap} | null = null;
    qlwzshb = 企料位置识别;

    get isDrawingLine() {
        return this.status.cadStatus instanceof CadStatusDrawLine;
    }
    get drawLineName() {
        return new CadStatusDrawLine().name;
    }
    get isMovingLines() {
        return this.status.cadStatus instanceof CadStatusMoveLines;
    }
    get moveLinesName() {
        return new CadStatusMoveLines().name;
    }
    get isCuttingLine() {
        return this.status.cadStatus instanceof CadStatusCutLine;
    }
    get cutLineName() {
        return new CadStatusCutLine().name;
    }
    get isAddingWHDashedLines() {
        const cadStatus = this.status.cadStatus;
        return cadStatus instanceof CadStatusIntersection && cadStatus.info === "addWHDashedLines";
    }
    get data() {
        return this.status.cad.data;
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
            const c = new ColoredObject(value);
            if (c.getColor().isLight()) {
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

    constructor(
        private status: AppStatusService,
        private dialog: MatDialog,
        private message: MessageService,
        private dataService: CadDataService
    ) {
        super();
    }

    async ngOnInit() {
        let prevSelectMode: CadViewerConfig["selectMode"];
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            const cad = this.status.cad;
            if (cadStatus instanceof CadStatusDrawLine) {
                prevSelectMode = cad.getConfig("selectMode");
                cad.setConfig("selectMode", "none");
                cad.traverse((e) => {
                    e.info.prevSelectable = e.selectable;
                    e.selectable = false;
                });
                this.lineDrawing = {};
                this._updateCadPoints();
            } else if (cadStatus instanceof CadStatusMoveLines) {
                this.linesMoving = {};
                this._updateCadPoints();
            } else if (cadStatus instanceof CadStatusCutLine) {
                this.linesCutting = {lines: [], points: []};
                this._updateCadPoints();
            } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === cadStatusIntersectionInfo) {
                this.addWHDashedLinesStart();
            }
        });
        this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
            const cad = this.status.cad;
            const {linesCutting} = this;
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
                cad.setConfig("selectMode", prevSelectMode);
                this.lineDrawing = null;
                this.status.setCadPoints();
            } else if (cadStatus instanceof CadStatusMoveLines) {
                this.status.setCadPoints();
                this.linesMoving = null;
            } else if (cadStatus instanceof CadStatusCutLine) {
                this.status.setCadPoints();
                this.linesCutting = null;
                if (cadStatus.confirmed && linesCutting) {
                    const lines = linesCutting.lines;
                    linesCutting.points.forEach((point) => {
                        let index = -1;
                        let split1: CadLine | undefined;
                        let split2: CadLine | undefined;
                        lines.forEach((line, i) => {
                            if (line.curve.contains(point)) {
                                split1 = new CadLine(line.export(), [], true);
                                split2 = new CadLine();
                                split2.setColor(line.getColor());
                                split2.zhankaixiaoshuchuli = line.zhankaixiaoshuchuli;
                                split1.end.copy(point);
                                split2.start.copy(point);
                                split2.end.copy(line.end);
                                index = i;
                                cad.data.entities.add(split1, split2);
                                cad.remove(line);
                            }
                        });
                        if (index > -1 && split1 && split2) {
                            lines.splice(index, 1, split1, split2);
                        }
                    });
                }
            } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === cadStatusIntersectionInfo) {
                this.addWHDashedLinesEnd();
            }
        });
        this.subscribe(this.status.cadPoints$, async (cadPoints) => {
            const activePoints = cadPoints.filter((v) => v.active);
            const cadStatus = this.status.cadStatus;
            if (!activePoints.length) {
                return;
            }
            const cad = this.status.cad;
            const worldPoints = activePoints.map((v) => cad.getWorldPoint(v.x, v.y));
            const {lineDrawing, linesMoving, linesCutting} = this;
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
                            this._updateCadPoints();
                        } else {
                            if (lineDrawing.start) {
                                entity.start.copy(worldPoints[0]);
                            } else {
                                entity.end.copy(worldPoints[0]);
                            }
                            cad.data.entities.add(entity);
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
                        this.status.setCadPoints(cad.data.getAllEntities(), cadPoints);
                    }
                }
            } else if (cadStatus instanceof CadStatusCutLine && linesCutting) {
                linesCutting.points = worldPoints;
            } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === cadStatusIntersectionInfo) {
                const worldPoint = worldPoints[0];
                const map = this.WHDashedLines?.map;
                if (!worldPoint || !map) {
                    return;
                }
                const index = map.findIndex(({point}) => worldPoint.equals(point));
                if (index >= 0) {
                    map[index].lines.forEach((l) => (l.opacity = 1));
                    map.splice(index, 1);
                }
                generateLineTexts(cad.data);
                this.toggleWHDashedLines();
            }
        });

        this.subscribe(this.status.openCad$, () => {
            this._onEntitiesChange();
        });
        {
            const cad = this.status.cad;
            cad.on("pointermove", this._onPointerMove);
            cad.on("click", this._onClick);
            cad.on("entitiesselect", this._onEntitiesChange);
            cad.on("entitiesunselect", this._onEntitiesChange);
            cad.on("entitiesadd", this._onEntitiesChange);
            cad.on("entitiesremove", this._onEntitiesChange);
            cad.on("moveentities", this._updateCadPoints);
            cad.on("zoom", this._updateCadPoints);
        }

        const response = await this.dataService.get<number[]>("ngcad/getZhewan");
        if (response?.data) {
            this.zhewan = response.data;
        }
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        const cad = this.status.cad;
        cad.off("pointermove", this._onPointerMove);
        cad.off("click", this._onClick);
        cad.off("entitiesselect", this._onEntitiesChange);
        cad.off("entitiesunselect", this._onEntitiesChange);
        cad.off("entitiesadd", this._onEntitiesChange);
        cad.off("entitiesremove", this._onEntitiesChange);
        cad.off("moveentities", this._updateCadPoints);
        cad.off("zoom", this._updateCadPoints);
    }

    private _onPointerMove: CadEventCallBack<"pointermove"> = async ({clientX, clientY, shiftKey}) => {
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
                cad.data.entities.add(entity);
                await cad.render(entity);
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
        await cad.render(entity);
    };

    private _onClick: CadEventCallBack<"click"> = (_event: MouseEvent) => {
        const lineDrawing = this.lineDrawing;
        const entity = lineDrawing?.entity;
        if (!lineDrawing || !entity) {
            // this.status.addCadPoint({x: event.clientX, y: event.clientY, active: true});
            return;
        }
        if (lineDrawing.oldEntity) {
        } else {
            this.status.setLinesLength([entity], Math.round(entity.length));
            this.addLineDrawing();
        }
    };

    private _onEntitiesChange = () => {
        const {line, arc} = this.status.cad.selected();
        const selected = [...line, ...arc];
        this.selected = selected;
        selected.forEach((e) => {
            if (e instanceof CadLine) {
                ["gongshi", "guanlianbianhuagongshi"].forEach((v) => this.validateLineText(v, e[v as keyof CadLine] as string));
            }
        });
        this.editDiabled = selected.length < 1;
        this.colorText = this.getCssColor();
    };

    private _updateCadPoints = () => {
        const {lineDrawing, linesMoving, linesCutting, selected, WHDashedLines} = this;
        const selected0 = selected[0];
        const cad = this.status.cad;
        if (lineDrawing) {
            this.status.setCadPoints(cad.data.getAllEntities());
            this.lineDrawing = {};
        } else if (linesMoving) {
            if (linesMoving.start) {
                const exclude = this.status.getCadPoints(new CadEntities().fromArray(this.selected));
                this.status.setCadPoints(cad.data.getAllEntities(), exclude);
            } else {
                if (selected.length < 1) {
                    this.message.alert("没有选中线");
                    this.moveLines();
                    this.linesMoving = null;
                } else {
                    this.status.setCadPoints(new CadEntities().fromArray(this.selected));
                }
            }
        } else if (linesCutting) {
            if (!(selected0 instanceof CadLine)) {
                this.message.alert("请先选中一条直线");
                this.cutLine();
                this.linesCutting = null;
            } else {
                const points: CadPoints = [];
                const {curve, start, end} = selected0;
                cad.data.getAllEntities().line.forEach((l) => {
                    if (l.id === selected0.id) {
                        return;
                    }
                    const intersection = l.curve.intersects(curve);
                    if (intersection && !intersection.equals(start) && !intersection.equals(end)) {
                        const {x, y} = this.status.cad.getScreenPoint(intersection.x, intersection.y);
                        points.push({x, y, active: false, lines: []});
                    }
                });
                if (points.length) {
                    this.status.cadPoints$.next(points);
                    this.linesCutting = {lines: [selected0], points: []};
                } else {
                    this.message.alert("无法截这条线(相交的线不足)");
                }
            }
        } else if (WHDashedLines) {
            this.status.setCadPoints(WHDashedLines.map);
        }
    };

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

    async setLineLength(event: Event) {
        const {selected} = this;
        const cad = this.status.cad;
        const lines = selected.filter((v) => v instanceof CadLine) as CadLine[];
        this.status.setLinesLength(lines, Number((event.target as HTMLInputElement).value));
        this.status.validate();
        await cad.render();
        if (lines.some((v) => v.zhankaifangshi === "指定长度")) {
            this.message.snack("线的展开方式为指定长度");
        }
    }

    getCssColor() {
        const lines = this.selected;
        if (lines.length === 1) {
            return lines[0].getColor().hex();
        }
        if (lines.length) {
            const strs = Array.from(new Set(lines.map((l) => l.getColor().hex())));
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
        this.selected.forEach((e) => e.setColor(value));
        this.status.cad.render();
    }

    getLineText(field: string, i?: number) {
        const lines = this.selected;
        let result = "";
        if (field === "kegaimingzi") {
            if (lines.length === 1) {
                const line = lines[0];
                const vars = line.root?.root?.info.vars;
                if (vars) {
                    for (const key in vars) {
                        if (vars[key] === line.id) {
                            return key;
                        }
                    }
                }
            }
            return "";
        }
        if (lines.length === 1) {
            if (typeof i === "number") {
                result = (lines as any)[0][field][i];
            } else {
                result = (lines as any)[0][field];
            }
        } else if (lines.length) {
            let texts = lines.map((l: any) => {
                if (typeof i === "number") {
                    return l[field][i] as string;
                } else {
                    return l[field] as string;
                }
            });
            texts = uniq(texts);
            if (texts.length === 1) {
                result = texts[0];
            } else {
                result = field === this.focusedField ? "" : "多个值";
            }
        }
        if (result === undefined || result === null) {
            result = "";
        }
        return result;
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    setLineText = debounce((event: InputEvent | MatSelectChange | Event, field: string, i?: number) => {
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
        const cad = this.status.cad;
        if (field === "kegaimingzi") {
            const vars = this.selected[0].root?.root?.info.vars;
            if (vars) {
                const toRender: CadLineLike[] = [];
                if (vars[value]) {
                    const e = cad.data.getAllEntities().line.find((v) => v.id === vars[value]);
                    if (e) {
                        toRender.push(e);
                    }
                }
                vars[value] = this.selected[0].id;
                toRender.push(this.selected[0]);
                cad.render(toRender);
            }
            return;
        }
        if (field === "zhewanValue" && value < 0) {
            this.message.alert("指定折弯标记位置不能小于0");
            value = 0;
        }
        if (this.validateLineText(field, value)) {
            this.selected.forEach((e) => {
                if (typeof i === "number") {
                    (e as any)[field][i] = value;
                } else {
                    (e as any)[field] = value;
                }
                const keys: (keyof CadLineLike)[] = [
                    "mingzi",
                    "gongshi",
                    "guanlianbianhuagongshi",
                    "lengthTextSize",
                    "linewidth",
                    "显示线长",
                    "圆弧显示"
                ];
                if (keys.includes(field as keyof CadLineLike)) {
                    cad.render(e);
                }
            });
        }
    }, 500);

    validateLineText(field: string, value: string | number) {
        value = value.toString();
        if (field === "gongshi") {
            if (value.includes("变化值")) {
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
        this.status.toggleCadStatus(new CadStatusMoveLines());
    }

    cutLine() {
        this.status.toggleCadStatus(new CadStatusCutLine());
    }

    addLineDrawing() {
        const lineDrawing = this.lineDrawing;
        const entity = lineDrawing?.entity;
        if (!lineDrawing || !entity) {
            return;
        }
        const cad = this.status.cad;
        cad.render(entity);
        entity.opacity = 1;
        entity.selectable = true;
        delete lineDrawing.entity;
        delete lineDrawing.start;
        delete lineDrawing.end;
        this.status.setCadPoints(cad.data.getAllEntities());
    }

    async autoFix() {
        const {selected} = this;
        const cad = this.status.cad;
        selected.forEach((e) => {
            if (e instanceof CadLine) {
                autoFixLine(cad, e);
            }
        });
        this.status.validate();
        await cad.render();
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

    getHideLengthChecked() {
        return this.selected.length > 0 && this.selected.every((v) => v.hideLength);
    }

    getHideLengthIndeterminate() {
        return !this.getHideLengthChecked() && this.selected.some((v) => v.hideLength);
    }

    setHideLength(event: MatCheckboxChange) {
        this.selected.forEach((v) => (v.hideLength = event.checked));
        this.status.cad.render(this.selected);
    }

    canAddWHDashedLines() {
        if (this.selected.length !== 1) {
            return false;
        }
        const line = this.selected[0];
        if (line instanceof CadLineLike) {
            const {deltaX, deltaY} = line;
            return deltaX !== 0 && deltaY !== 0;
        }
        return false;
    }

    toggleWHDashedLines() {
        this.status.toggleCadStatus(new CadStatusIntersection(cadStatusIntersectionInfo));
    }

    addWHDashedLinesStart() {
        const line = this.selected[0];
        const data = this.data;
        if (!(line instanceof CadLineLike) || !data) {
            return;
        }
        const {minX, minY, maxX, maxY, start, end} = line;
        const topLeft = new Point(minX, maxY);
        const topRight = new Point(maxX, maxY);
        const bottomLeft = new Point(minX, minY);
        const bottomRight = new Point(maxX, minY);
        const points: [Point, Point, Required<CadLine>["宽高虚线"]["position"]][] = [
            [topLeft, topRight, "上"],
            [bottomLeft, bottomRight, "下"],
            [topLeft, bottomLeft, "左"],
            [topRight, bottomRight, "右"]
        ];

        const lines = points.map((v) => {
            const l = new CadLine({start: v[0], end: v[1]});
            l.dashArray = DEFAULT_DASH_ARRAY;
            l.opacity = 0.7;
            l.宽高虚线 = {source: line.id, position: v[2]};
            return l;
        });
        const map: PointsMap = [
            {point: new Point(), lines: [], selected: false},
            {point: new Point(), lines: [], selected: false}
        ];
        if (bottomLeft.equals(start) || bottomLeft.equals(end)) {
            map[0].point.copy(topLeft);
            map[1].point.copy(bottomRight);
            map[0].lines = [lines[0], lines[2]];
            map[1].lines = [lines[1], lines[3]];
        } else {
            map[0].point.copy(bottomLeft);
            map[1].point.copy(topRight);
            map[0].lines = [lines[1], lines[2]];
            map[1].lines = [lines[0], lines[3]];
        }
        this.WHDashedLines = {line, map};
        this.status.setCadPoints(map);
        line.addChild(...lines);
        this.status.cad.render(lines);
    }

    addWHDashedLinesEnd() {
        if (this.WHDashedLines) {
            this.WHDashedLines.map.forEach((v) => v.lines.forEach((line) => line.remove()));
            this.WHDashedLines = null;
            this.status.setCadPoints();
        }
    }
}
