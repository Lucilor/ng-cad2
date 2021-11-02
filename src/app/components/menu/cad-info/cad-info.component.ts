import {Component, OnInit, OnDestroy, Output, EventEmitter} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {ActivatedRoute} from "@angular/router";
import {splitOptions, joinOptions} from "@app/app.common";
import {getCadGongshiText} from "@app/cad.utils";
import {CadData, CadLine, CadEventCallBack, CadBaseLine, CadJointPoint, CadEntity, sortLines} from "@cad-viewer";
import {openCadDataAttrsDialog} from "@components/dialogs/cad-data-attrs/cad-data-attrs.component";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {editCadZhankai} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {Subscribed} from "@mixins/subscribed.mixin";
import {Utils} from "@mixins/utils.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService, CadPoints} from "@services/app-status.service";
import {CadStatusSelectBaseline, CadStatusSelectJointpoint, CadStatusIntersection} from "@services/cad-status";
import {isEqual} from "lodash";

const cadStatusIntersectionInfo = "zhidingweizhipaokeng";

@Component({
    selector: "app-cad-info",
    templateUrl: "./cad-info.component.html",
    styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends Subscribed(Utils()) implements OnInit, OnDestroy {
    cadsData: CadData[] = [];
    editDisabled = true;
    private _cadPointsLock = false;
    private _算料单显示 = [
        "尺寸",
        "板材",
        "尺寸+板材",
        "名字",
        "名字+板材",
        "名字+展开宽",
        "名字+展开宽+展开高",
        "名字+展开高+展开宽",
        "名字+展开高+板材",
        "名字+展开高",
        "展开宽",
        "展开高",
        "展开宽+展开高",
        "展开高+展开宽",
        "展开宽+板材",
        "展开高+板材",
        "展开宽+展开高+板材",
        "展开高+展开宽+板材",
        "都不显示"
    ];
    sldxs = this._算料单显示.slice();
    @Output() cadLengthsChange = new EventEmitter<string[]>();

    private _onEntityClick = (
        ((entity) => {
            const cadStatus = this.status.cadStatus;
            const data = this.status.getFlatSelectedCads()[0];
            if (cadStatus instanceof CadStatusSelectBaseline) {
                if (entity instanceof CadLine) {
                    const baseLine = data.baseLines[cadStatus.index];
                    if (entity.isHorizontal()) {
                        baseLine.idY = entity.selected ? entity.id : "";
                    }
                    if (entity.isVertical()) {
                        baseLine.idX = entity.selected ? entity.id : "";
                    }
                    data.updateBaseLines();
                    data.getAllEntities().forEach((e) => {
                        e.selected = [baseLine.idX, baseLine.idY].includes(e.id);
                    });
                    this.status.cad.render();
                }
            }
        }) as CadEventCallBack<"entityclick">
    ).bind(this);

    private _updateCadPoints = (() => {
        const cadStatus = this.status.cadStatus;
        const data = this.cadsData[0];
        if (cadStatus instanceof CadStatusSelectJointpoint) {
            const points = this.status.getCadPoints(this.cadsData[0].getAllEntities());
            const {valueX, valueY} = data.jointPoints[cadStatus.index];
            this._setActiveCadPoint({x: valueX, y: valueY}, points);
            this._cadPointsLock = true;
            this.status.cadPoints$.next(points);
        } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === cadStatusIntersectionInfo) {
            const points = this.status.getCadPoints(this.cadsData[0].getAllEntities()).filter((v) => v.lines.length > 1);
            this._setActiveCadPoint({lines: data.zhidingweizhipaokeng[cadStatus.index]}, points);
            this._cadPointsLock = true;
            this.status.cadPoints$.next(points);
        }
    }).bind(this);

    constructor(
        private status: AppStatusService,
        private dialog: MatDialog,
        private message: MessageService,
        private route: ActivatedRoute
    ) {
        super();
    }

    ngOnInit() {
        this.subscribe(this.status.selectedCads$, () => {
            this.cadsData = this.status.getFlatSelectedCads();
            if (this.cadsData.length === 1) {
                this.editDisabled = false;
            } else {
                this.editDisabled = true;
                if (this.cadsData.length < 1) {
                    this.cadsData = [new CadData()];
                }
            }
            this.updateLengths(this.cadsData);
        });
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            if (cadStatus instanceof CadStatusSelectJointpoint) {
                this._updateCadPoints();
            } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === cadStatusIntersectionInfo) {
                this._updateCadPoints();
            }
        });
        this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
            if (cadStatus instanceof CadStatusSelectJointpoint) {
                this._cadPointsLock = true;
                this.status.setCadPoints();
            } else if (cadStatus instanceof CadStatusIntersection) {
                this._cadPointsLock = true;
                this.status.setCadPoints();
            }
        });
        this.subscribe(this.status.cadPoints$, (points) => {
            const activePoints = points.filter((p) => p.active);
            const cadStatus = this.status.cadStatus;
            if (this._cadPointsLock) {
                this._cadPointsLock = false;
                return;
            }
            if (cadStatus instanceof CadStatusSelectJointpoint) {
                const jointPoint = this.cadsData[0].jointPoints[cadStatus.index];
                if (activePoints.length < 1) {
                    jointPoint.valueX = NaN;
                    jointPoint.valueY = NaN;
                } else {
                    const {valueX: x, valueY: y} = jointPoint;
                    for (const p of activePoints) {
                        const p2 = this._setActiveCadPoint({x, y}, points);
                        if (!p2 || !isEqual([p.x, p.y], [p2.x, p2.y])) {
                            jointPoint.valueX = p.x;
                            jointPoint.valueY = p.y;
                            this._updateCadPoints();
                            break;
                        }
                    }
                }
            } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === cadStatusIntersectionInfo) {
                const index = cadStatus.index;
                const lines = this.cadsData[0].zhidingweizhipaokeng[index];
                if (activePoints.length < 1) {
                    this.cadsData[0].zhidingweizhipaokeng[index] = [];
                } else {
                    for (const p of activePoints) {
                        const p2 = this._setActiveCadPoint({lines}, points);
                        if (!p2 || !isEqual(p.lines, p2.lines)) {
                            this.cadsData[0].zhidingweizhipaokeng[index] = p.lines.slice();
                            this._updateCadPoints();
                            break;
                        }
                    }
                }
            }
        });
        this.subscribe(this.status.openCad$, () => {
            const sldxsArr = this.status.cad.data.components.data.map((v) => v.suanliaodanxianshi);
            this.sldxs = Array.from(new Set(sldxsArr.concat(this._算料单显示)));
        });
        const cad = this.status.cad;
        cad.on("entityclick", this._onEntityClick);
        cad.on("moveentities", this._updateCadPoints);
        cad.on("zoom", this._updateCadPoints);
    }

    ngOnDestroy() {
        const cad = this.status.cad;
        cad.off("entityclick", this._onEntityClick);
        cad.off("moveentities", this._updateCadPoints);
        cad.off("zoom", this._updateCadPoints);
    }

    private _setActiveCadPoint(point: Partial<CadPoints[0]>, points: CadPoints) {
        points.forEach((p) => (p.active = false));
        for (const p of points) {
            if (isEqual(p.lines, point.lines) || isEqual([p.x, p.y], [point.x, point.y])) {
                p.active = true;
                return p;
            }
        }
        return null;
    }

    updateLengths(cadsData: CadData[]) {
        const lengths: string[] = [];
        cadsData.forEach((v) => {
            let length = 0;
            const entities = v.getAllEntities();
            entities.line.forEach((e) => (length += e.length));
            entities.arc.forEach((e) => (length += e.length));
            entities.circle.forEach((e) => (length += e.curve.length));
            lengths.push(length.toFixed(2));
        });
        this.cadLengthsChange.emit(lengths);
    }

    async selectOptions(data: CadData, optionKey: string, key?: string) {
        if (optionKey === "huajian") {
            const checkedItems = splitOptions(data.huajian);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "花件", checkedItems, xinghao: key}});
            if (Array.isArray(result)) {
                data.huajian = joinOptions(result);
            }
        } else if (optionKey === "bancai") {
            const checkedItems = splitOptions(data.morenkailiaobancai);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "板材", checkedItems, multi: false}});
            if (Array.isArray(result) && key) {
                (data as any)[key] = joinOptions(result);
            }
        } else {
            const checkedItems = splitOptions(data.options[optionKey]);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: optionKey, checkedItems}});
            if (result) {
                data.options[optionKey] = joinOptions(result);
            }
        }
    }

    getBaselineItemColor(i: number) {
        const cadStatus = this.status.cadStatus;
        if (cadStatus instanceof CadStatusSelectBaseline && i === cadStatus.index) {
            return "accent";
        }
        return "primary";
    }

    getJointPointItemColor(i: number) {
        const cadStatus = this.status.cadStatus;
        if (cadStatus instanceof CadStatusSelectJointpoint && i === cadStatus.index) {
            return "accent";
        }
        return "primary";
    }

    addBaseLine(data: CadData, index: number) {
        data.baseLines.splice(index + 1, 0, new CadBaseLine());
    }

    async removeBaseLine(data: CadData, index: number) {
        if (await this.message.confirm("是否确定删除？")) {
            const arr = data.baseLines;
            if (arr.length === 1) {
                arr[0] = new CadBaseLine();
            } else {
                arr.splice(index, 1);
            }
        }
    }

    selectBaseLine(i: number) {
        this.status.toggleCadStatus(new CadStatusSelectBaseline(i));
    }

    addJointPoint(data: CadData, index: number) {
        data.jointPoints.splice(index + 1, 0, new CadJointPoint());
    }

    async removeJointPoint(data: CadData, index: number) {
        if (await this.message.confirm("是否确定删除？")) {
            const arr = data.jointPoints;
            if (arr.length === 1) {
                arr[0] = new CadJointPoint();
            } else {
                arr.splice(index, 1);
            }
        }
    }

    selectJointPoint(i: number) {
        this.status.toggleCadStatus(new CadStatusSelectJointpoint(i));
    }

    updateCadGongshi(data: CadData) {
        const mtext = data.entities.mtext.find((e) => e.info.isCadGongshi);
        if (mtext) {
            mtext.text = getCadGongshiText(data);
            this.status.cad.render(mtext);
        }
    }

    offset(event: MatSelectChange) {
        const value: CadData["bancaihoudufangxiang"] = event.value;
        const data = this.status.getFlatSelectedCads()[0];
        const cad = this.status.cad;
        data.bancaihoudufangxiang = value;
        let direction = 0;
        if (value === "gt0") {
            direction = 1;
        } else if (value === "lt0") {
            direction = -1;
        } else {
            return;
        }
        const distance = 2;
        const lines = sortLines(data);
        lines.forEach((v) => (v[0].mingzi = "起始线"));
        const entities = data.getAllEntities().clone(true);
        entities.offset(direction, distance);
        cad.add(entities);

        const blinkInterval = 500;
        const blinkCount = 3;
        const blink = (el: CadEntity["el"]) => {
            if (el) {
                el.css("opacity", "1");
                setTimeout(() => el.css("opacity", "0"), blinkInterval);
            }
        };
        entities.forEach((e) => {
            const el = e.el;
            if (el) {
                el.css("transition", blinkInterval + "ms");
                blink(el);
            }
        });
        let count = 1;
        const id = setInterval(() => {
            entities.forEach((e) => blink(e.el));
            if (++count > blinkCount) {
                clearInterval(id);
                cad.remove(entities);
            }
        }, blinkInterval * 2);
    }

    async editAttributes(data: CadData) {
        const result = await openCadDataAttrsDialog(this.dialog, {data: data.attributes});
        if (result) {
            data.attributes = result;
        }
    }

    async editZhankai(data: CadData) {
        await editCadZhankai(this.dialog, data);
    }

    setCadName(data: CadData, event: Event) {
        const name = (event.target as HTMLInputElement).value;
        data.name = name;
        const zhankai = data.zhankai[0];
        if (zhankai) {
            zhankai.name = name;
        }
    }

    selectZhidingweizhipaokeng(i: number) {
        this.status.toggleCadStatus(new CadStatusIntersection(cadStatusIntersectionInfo, i));
    }

    getZhidingweizhipaokengColor(i: number) {
        const cadStatus = this.status.cadStatus;
        if (cadStatus instanceof CadStatusIntersection && cadStatus.info === cadStatusIntersectionInfo && i === cadStatus.index) {
            return "accent";
        }
        return "primary";
    }

    async copyCadId(cad: CadData) {
        await navigator.clipboard.writeText(cad.id);
        this.message.snack("id已复制");
    }

    async selectGensuiCad(cad: CadData) {
        console.log(cad.xinghaohuajian);
    }
}
