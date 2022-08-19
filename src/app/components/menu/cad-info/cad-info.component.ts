import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {splitOptions, joinOptions} from "@app/app.common";
import {CadData, CadLine, CadEventCallBack, CadBaseLine, CadJointPoint, CadEntity, sortLines} from "@cad-viewer";
import {openCadDataAttrsDialog} from "@components/dialogs/cad-data-attrs/cad-data-attrs.component";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {editCadZhankai} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {openKlkwpzDialog} from "@components/dialogs/klkwpz-dialog/klkwpz-dialog.component";
import {Subscribed} from "@mixins/subscribed.mixin";
import {Utils} from "@mixins/utils.mixin";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService, CadPoints} from "@services/app-status.service";
import {CadStatusSelectBaseline, CadStatusSelectJointpoint, CadStatusIntersection} from "@services/cad-status";
import {isEqual} from "lodash";

type InsertsectionKey = "zhidingweizhipaokeng" | "指定分体位置" | "指定位置不折";

@Component({
    selector: "app-cad-info",
    templateUrl: "./cad-info.component.html",
    styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends Subscribed(Utils()) implements OnInit, OnDestroy {
    private _cadPointsLock = false;
    insertsectionInfo: {key: InsertsectionKey; label: string}[] = [
        {key: "zhidingweizhipaokeng", label: "指定位置刨坑"},
        {key: "指定分体位置", label: "指定分体位置"},
        {key: "指定位置不折", label: "指定位置不折"}
    ];
    cadStatusIntersectionInfo: InsertsectionKey | null = null;
    get data() {
        const components = this.status.components.selected$.value;
        if (components.length === 1) {
            return components[0];
        }
        return this.status.cad.data;
    }
    infoGroup1: InputInfo[] = [
        {label: "id", model: this._getcadDataModel("id"), type: "string", readonly: true, copyable: true},
        {label: "名字", model: this._getcadDataModel("name"), type: "string", onChange: this.setCadName.bind(this)},
        {label: "唯一码", model: {data: () => this.data.info, key: "唯一码"}, type: "string"},
        {label: "显示名字", model: this._getcadDataModel("xianshimingzi"), type: "string"},
        {label: "分类", model: this._getcadDataModel("type"), type: "string"},
        {label: "分类2", model: this._getcadDataModel("type2"), type: "string"},
        {label: "选项", model: this._getcadDataModel("options"), type: "object", isCadOptions: true},
        {label: "条件", model: this._getcadDataModel("conditions"), type: "array"}
    ];
    infoGroup2: InputInfo[] = [
        {label: "开料时刨坑", model: this._getcadDataModel("kailiaoshibaokeng"), type: "boolean"},
        {
            label: "变形方式",
            model: this._getcadDataModel("bianxingfangshi"),
            type: "select",
            options: ["自由", "高比例变形", "宽比例变形", "宽高比例变形"]
        },
        {
            label: "板材纹理方向",
            model: this._getcadDataModel("bancaiwenlifangxiang"),
            type: "select",
            options: ["垂直", "水平", "不限", "指定垂直", "指定水平", "指定不限"]
        },
        {
            label: "开料排版方式",
            model: this._getcadDataModel("kailiaopaibanfangshi"),
            type: "select",
            options: ["自动排版", "不排版", "必须排版"]
        },
        {label: "默认开料板材", model: this._getcadDataModel("morenkailiaobancai"), type: "string", optionKey: "bancai"},
        {label: "固定开料板材", model: this._getcadDataModel("gudingkailiaobancai"), type: "string", optionKey: "bancai"},
        {
            label: "算料处理",
            model: this._getcadDataModel("suanliaochuli"),
            type: "select",
            options: ["算料+显示展开+开料", "算料+开料", "算料+显示展开", "算料"]
        },
        {label: "显示宽度标注", model: this._getcadDataModel("showKuandubiaozhu"), type: "boolean"},
        {
            label: "板材厚度方向",
            model: this._getcadDataModel("bancaihoudufangxiang"),
            type: "select",
            options: [
                {value: "gt0", label: "方向1"},
                {value: "lt0", label: "方向2"},
                {value: "none", label: "不指定"}
            ],
            onChange: this.offset.bind(this)
        },
        {label: "自定义属性", type: "string", disabled: true, suffixIcons: [{name: "list", onClick: () => this.editAttributes(this.data)}]},
        // {label: "展开", type: "string", disabled: true, suffixIcons: [{name: "list", onClick: () => this.editZhankai(this.data)}]},
        {label: "型号花件", model: this._getcadDataModel("xinghaohuajian"), type: "object", isCadOptions: true},
        {label: "必须绑定花件", model: this._getcadDataModel("needsHuajian"), type: "boolean"},
        {label: "可独立板材", model: this._getcadDataModel("kedulibancai"), type: "boolean"},
        {label: "必须选择板材", model: this._getcadDataModel("必须选择板材"), type: "boolean"},
        {label: "双向折弯", model: this._getcadDataModel("shuangxiangzhewan"), type: "boolean"},
        {
            label: "算料单显示",
            model: this._getcadDataModel("suanliaodanxianshi"),
            type: "select",
            options: [
                "尺寸",
                "板材",
                "尺寸+板材",
                "名字",
                "名字+板材",
                "名字+展开宽",
                "名字+展开宽+展开高",
                "名字+展开高+展开宽",
                "名字+展开高+板材",
                "名字+展开宽+展开高+板材",
                "名字+展开高",
                "展开宽",
                "展开高",
                "展开宽+展开高",
                "展开高+展开宽",
                "展开宽+板材",
                "展开高+板材",
                "展开宽+展开高+板材",
                "展开高+展开宽+板材",
                "都不显示",
                "所有"
            ]
        }
    ];
    infoGroup3: InputInfo[] = [
        {label: "算料单显示放大倍数", model: this._getcadDataModel("suanliaodanZoom"), type: "number", step: 0.1, min: 0},
        {label: "企料前后宽同时改变", model: this._getcadDataModel("企料前后宽同时改变"), type: "boolean"},
        {label: "主CAD", model: this._getcadDataModel("主CAD"), type: "boolean"},
        {
            label: "算料单展开显示位置",
            model: this._getcadDataModel("算料单展开显示位置"),
            type: "select",
            options: ["CAD上面", "CAD下面", "CAD中间", "CAD左边", "CAD右边"]
        },
        {label: "属于门框门扇", model: this._getcadDataModel("属于门框门扇"), type: "select", options: ["未区分", "门框", "门扇"]},
        {label: "内开做分体", model: this._getcadDataModel("内开做分体"), type: "boolean"},
        {label: "板材绑定选项", model: this._getcadDataModel("板材绑定选项"), type: "string"},
        {label: "算料单线长显示的最小长度", model: this._getcadDataModel("算料单线长显示的最小长度"), type: "number"},
        {label: "检查企料厚度", model: this._getcadDataModel("检查企料厚度"), type: "boolean"},
        {label: "对应门扇厚度", model: this._getcadDataModel("对应门扇厚度"), type: "number"},
        {label: "显示厚度", model: this._getcadDataModel("显示厚度"), type: "string"},
        {label: "跟随CAD开料板材", model: this._getcadDataModel("跟随CAD开料板材"), type: "string"},
        {label: "算料特殊要求", model: this._getcadDataModel("算料特殊要求"), type: "string", textarea: {autosize: {maxRows: 5}}},
        {label: "正面宽差值", model: this._getcadDataModel("正面宽差值"), type: "number"},
        {label: "墙厚差值", model: this._getcadDataModel("墙厚差值"), type: "number"},
        {label: "企料翻转", model: this._getcadDataModel("企料翻转"), type: "boolean"},
        {label: "企料门框配合位增加值", model: this._getcadDataModel("企料包边门框配合位增加值"), type: "number"},
        {
            label: "企料包边类型",
            model: this._getcadDataModel("企料包边类型"),
            type: "select",
            options: ["自动判断", "胶条位包", "外面包", "胶条位包+外面包", "无"]
        },
        {label: "指定封口厚度", model: this._getcadDataModel("指定封口厚度"), type: "string"},
        {label: "拼接料拼接时垂直翻转", model: this._getcadDataModel("拼接料拼接时垂直翻转"), type: "boolean"},
        {
            label: "正面线到见光线展开模板",
            model: {data: () => this.data.info, key: "正面线到见光线展开模板"},
            type: "string",
            suffixIcons: [
                {name: "open_in_new", onClick: () => this.openCadmuban(this.data.info.正面线到见光线展开模板)},
                {name: "list", onClick: () => this.selectCadmuban()}
            ]
        },
        {label: "对应计算条数的配件", model: this._getcadDataModel("对应计算条数的配件"), type: "object", isCadOptions: true},
        {
            label: "指定板材分组",
            model: this._getcadDataModel("指定板材分组"),
            type: "select",
            options: ["门框板材", "底框板材", "门扇板材", "辅板1", "辅板2", "辅板3", "辅板4", "辅板5", "辅板6", "辅板7", "辅板8", "辅板9"]
        }
    ];

    constructor(private status: AppStatusService, private dialog: MatDialog, private message: MessageService) {
        super();
    }

    ngOnInit() {
        (window as any).c = this;
        this.subscribe(this.status.cadStatusEnter$, (cadStatus) => {
            const insertsectionKeys = this.insertsectionInfo.map((v) => v.key);
            if (cadStatus instanceof CadStatusSelectJointpoint) {
                this._updateCadPoints();
            } else if (cadStatus instanceof CadStatusIntersection && insertsectionKeys.includes(cadStatus.info as InsertsectionKey)) {
                this.cadStatusIntersectionInfo = cadStatus.info as InsertsectionKey;
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
                this.cadStatusIntersectionInfo = null;
            }
        });
        this.subscribe(this.status.cadPoints$, (points) => {
            const activePoints = points.filter((p) => p.active);
            const cadStatus = this.status.cadStatus;
            if (this._cadPointsLock) {
                this._cadPointsLock = false;
                return;
            }
            const data = this.data;
            if (cadStatus instanceof CadStatusSelectJointpoint) {
                const jointPoint = data.jointPoints[cadStatus.index];
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
            } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === this.cadStatusIntersectionInfo) {
                const key = this.cadStatusIntersectionInfo;
                const index = cadStatus.index;
                const lines = data[key][index];
                if (activePoints.length < 1) {
                    data[key][index] = [];
                } else {
                    for (const p of activePoints) {
                        const p2 = this._setActiveCadPoint({lines}, points);
                        if (!p2 || !isEqual(p.lines, p2.lines)) {
                            data[key][index] = p.lines.slice();
                            this._updateCadPoints();
                            break;
                        }
                    }
                }
            }
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

    private _getcadDataModel(key: keyof CadData) {
        return {key, data: () => this.data} as InputInfo<CadData>["model"];
    }

    private _onEntityClick: CadEventCallBack<"entityclick"> = (_, entity) => {
        const cadStatus = this.status.cadStatus;
        const data = this.data;
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
    };

    private _updateCadPoints = () => {
        const cadStatus = this.status.cadStatus;
        const data = this.data;
        const key = this.cadStatusIntersectionInfo;
        if (cadStatus instanceof CadStatusSelectJointpoint) {
            const points = this.status.getCadPoints(data.getAllEntities());
            const {valueX, valueY} = data.jointPoints[cadStatus.index];
            this._setActiveCadPoint({x: valueX, y: valueY}, points);
            this._cadPointsLock = true;
            this.status.cadPoints$.next(points);
        } else if (cadStatus instanceof CadStatusIntersection && cadStatus.info === key) {
            const points = this.status.getCadPoints(data.getAllEntities()).filter((v) => v.lines.length > 1);
            this._setActiveCadPoint({lines: data[key][cadStatus.index]}, points);
            this._cadPointsLock = true;
            this.status.cadPoints$.next(points);
        }
    };

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

    async selectOptions(data: CadData, optionKey: string, key: string) {
        if (optionKey === "huajian") {
            if (!key) {
                return;
            }
            const checkedItems = splitOptions(data.xinghaohuajian[key]);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "花件", checkedItems, xinghao: key}});
            if (Array.isArray(result)) {
                data.xinghaohuajian[key] = joinOptions(result);
            }
        } else if (optionKey === "bancai") {
            const checkedItems = splitOptions(data.morenkailiaobancai);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "板材", checkedItems, multi: false}});
            if (Array.isArray(result) && key) {
                (data as any)[key] = joinOptions(result);
            }
        } else {
            const checkedItems = splitOptions((data as any)[optionKey][key]);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: key, checkedItems}});
            if (result) {
                (data as any)[optionKey][key] = joinOptions(result);
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

    offset(value: string) {
        const data = this.data;
        const cad = this.status.cad;
        data.bancaihoudufangxiang = value as CadData["bancaihoudufangxiang"];
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

    setCadName(value: string) {
        this.status.updateTitle();
        const zhankai = this.data.zhankai[0];
        if (zhankai) {
            zhankai.name = value;
        }
    }

    selectPoint(i: number, key: InsertsectionKey) {
        this.cadStatusIntersectionInfo = key;
        this.status.toggleCadStatus(new CadStatusIntersection(key, i));
    }

    getPointColor(i: number, key: InsertsectionKey) {
        const cadStatus = this.status.cadStatus;
        if (cadStatus instanceof CadStatusIntersection && cadStatus.info === key && i === cadStatus.index) {
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

    openCadmuban(id: string) {
        this.status.openCadInNewTab(id, "kailiaocadmuban");
    }

    async selectCadmuban() {
        const checkedItems = [];
        if (this.data.info.正面线到见光线展开模板) {
            checkedItems.push(this.data.info.正面线到见光线展开模板);
        }
        const result = await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}});
        if (result?.length) {
            this.data.info.正面线到见光线展开模板 = result[0].id;
        }
    }

    async openKlkwpzDialog(data: CadData) {
        const result = await openKlkwpzDialog(this.dialog, {data: {source: data.info.开料孔位配置}});
        if (result) {
            data.info.开料孔位配置 = result;
        }
    }
}
