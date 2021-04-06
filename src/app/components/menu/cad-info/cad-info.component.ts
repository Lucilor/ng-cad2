import {Component, EventEmitter, OnDestroy, OnInit, Output} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {ActivatedRoute} from "@angular/router";
import {CadData, CadLine, CadEventCallBack, CadBaseLine, CadJointPoint, CadEntity} from "@src/app/cad-viewer";
import {getCadGongshiText} from "@src/app/cad.utils";
import {Subscribed} from "@src/app/mixins/subscribed.mixin";
import {Utils} from "@src/app/mixins/utils.mixin";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {CadStatusNormal, CadStatusSelectBaseline, CadStatusSelectJointpoint} from "@src/app/services/cad-status";
import {openCadDataAttrsDialog} from "../../dialogs/cad-data-attrs/cad-data-attrs.component";
import {openCadListDialog} from "../../dialogs/cad-list/cad-list.component";
import {openCadOptionsDialog} from "../../dialogs/cad-options/cad-options.component";
import {openCadZhankaiDialog} from "../../dialogs/cad-zhankai/cad-zhankai.component";

@Component({
    selector: "app-cad-info",
    templateUrl: "./cad-info.component.html",
    styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends Subscribed(Utils()) implements OnInit, OnDestroy {
    cadsData: CadData[] = [];
    editDisabled = true;
    @Output() cadLengthsChange = new EventEmitter<string[]>();

    onEntityClick = (((entity) => {
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
    }) as CadEventCallBack<"entityclick">).bind(this);

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
                this.status.setCadPoints(this.cadsData[0].getAllEntities());
            }
        });
        this.subscribe(this.status.cadStatusExit$, (cadStatus) => {
            if (cadStatus instanceof CadStatusSelectJointpoint) {
                this.status.setCadPoints();
            }
        });
        this.subscribe(this.status.cadPoints$, (cadPoints) => {
            const point = cadPoints.filter((v) => v.active)[0];
            const cadStatus = this.status.cadStatus;
            if (cadStatus instanceof CadStatusSelectJointpoint && point) {
                const jointPoint = this.cadsData[0].jointPoints[cadStatus.index];
                jointPoint.valueX = point.x;
                jointPoint.valueY = point.y;
            }
        });
        this.status.cad.on("entityclick", this.onEntityClick);
    }

    ngOnDestroy() {
        this.status.cad.off("entityclick", this.onEntityClick);
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

    async selectOptions(data: CadData, optionKey: string) {
        if (optionKey === "huajian") {
            const checkedItems = data.huajian.split(",");
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "花件", checkedItems}});
            if (Array.isArray(result)) {
                data.huajian = result.join(",");
            }
        } else if (optionKey === "bancai") {
            const checkedItems = data.morenkailiaobancai.split(",");
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "板材", checkedItems, multi: false}});
            if (Array.isArray(result)) {
                data.morenkailiaobancai = result.join(",");
            }
        } else {
            const checkedItems = data.options[optionKey].split(",");
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: optionKey, checkedItems}});
            if (result) {
                data.options[optionKey] = result.join(",");
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
        if (this.getBaselineItemColor(i) === "primary") {
            this.status.setCadStatus(new CadStatusSelectBaseline(i));
        } else {
            this.status.setCadStatus(new CadStatusNormal());
        }
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
        if (this.getJointPointItemColor(i) === "primary") {
            this.status.setCadStatus(new CadStatusSelectJointpoint(i));
        } else {
            this.status.setCadStatus(new CadStatusNormal());
        }
    }

    updateCadGongshi(data: CadData) {
        const mtext = data.entities.mtext.find((e) => e.info.isCadGongshi);
        if (mtext) {
            mtext.text = getCadGongshiText(data);
            this.status.cad.render(mtext);
        }
    }

    openKailiaomuban(data: CadData) {
        if (data.kailiaomuban) {
            const params = {...this.route.snapshot.queryParams};
            params.collection = "kailiaocadmuban";
            params.id = data.kailiaomuban;
            open("index?" + new URLSearchParams(params).toString());
        }
    }

    async selectKailiaomuban(data: CadData) {
        const checkedItems = [new CadData({id: data.kailiaomuban})];
        const result = await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}});
        if (result?.length) {
            data.kailiaomuban = result[0].id;
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
        const entities = data.getAllEntities().clone(true);
        entities.offset(direction, distance);
        cad.add(entities);

        const blinkInterval = 500;
        const blinkCount = 3;
        const blink = (el: CadEntity["el"]) => {
            if (el) {
                el.css("opacity", 1);
                setTimeout(() => el.css("opacity", 0), blinkInterval);
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

    setValue(event: Event, obj: any, field: any) {
        obj[field] = (event.target as HTMLInputElement).value;
    }

    async editZhankai(data: CadData) {
        const result = await openCadZhankaiDialog(this.dialog, {data: data.zhankai});
        if (result) {
            data.zhankai = result;
        }
    }
}
