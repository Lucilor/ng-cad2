import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {session} from "@app/app.common";
import {CadData, CadDimension, CadLeader, CadLine, CadLineLike, CadMtext, CadZhankai, sortLines} from "@cad-viewer";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {Line, ObjectOf, Point, ProgressBar} from "@utils";
import {fields} from "@views/import/import.config";
import Color from "color";
import {intersection} from "lodash";

type ExportType = "包边正面" | "框型和企料" | "指定型号" | "自由选择" | "导出选中";

interface ExportParams {
    ids: string[];
    direct?: boolean;
}

@Component({
    selector: "app-export",
    templateUrl: "./export.component.html",
    styleUrls: ["./export.component.scss"]
})
export class ExportComponent implements OnInit {
    progressBar = new ProgressBar(0);
    progressBarStatus: ProgressBarStatus = "hidden";
    msg = "";
    exportParams: ExportParams | null = null;
    direct = false;
    exportIds = true;

    constructor(private dialog: MatDialog, private dataService: CadDataService) {}

    ngOnInit() {
        this.exportParams = session.load<ExportParams>("exportParams");
        this.direct = !!this.exportParams?.direct;
        // session.remove("exportParams");
        if (this.direct) {
            this.exportCads("导出选中");
        } else if (this.exportParams) {
            const ids = this.exportParams.ids;
            if (!Array.isArray(ids) || ids.length < 1) {
                this.exportParams = null;
            }
        }
    }

    private async _queryIds(where: ObjectOf<any>) {
        return (await this.dataService.queryMongodb<{_id: string}>({collection: "cad", fields: ["_id"], where})).map((v) => v._id);
    }

    async exportCads(type: ExportType) {
        this.progressBar.start(1);
        this.progressBarStatus = "progress";
        this.msg = "正在获取数据";
        let ids: string[];
        switch (type) {
            case "包边正面":
                ids = await this._queryIds({分类: "包边正面"});
                break;
            case "框型和企料":
                ids = await this._queryIds({分类: {$regex: "^锁框|铰框|顶框|锁企料|扇锁企料|铰企料$"}});
                break;
            case "指定型号":
                ids = await this._queryIds({分类: "算料", "选项.型号": {$regex: "^.+$"}});
                break;
            case "自由选择":
                ids = (
                    (await openCadListDialog(this.dialog, {
                        data: {selectMode: "multiple", collection: "cad", search: {分类: "^.+$"}}
                    })) ?? []
                ).map((v) => v.id);
                break;
            case "导出选中":
                ids = this.exportParams?.ids || [];
                break;
            default:
                return;
        }
        if (ids.length > 0) {
            this.progressBar.start(ids.length + 1);
            try {
                const data = await this._joinCad(ids);
                this.msg = "正在下载dxf文件";
                await this.dataService.downloadDxf(data);
                this.progressBar.end();
                this.progressBarStatus = "success";
                this.msg = "导出完成";
            } catch (error) {
                this.progressBar.end();
                this.progressBarStatus = "error";
                this.msg = "导出失败";
            }
        } else {
            this.progressBarStatus = "error";
            this.msg = "没有CAD数据";
        }
    }

    private _addLeaders(cad: CadData) {
        const arr = cad.zhidingweizhipaokeng;
        const lines = sortLines(cad)[0];
        if (!lines) {
            return;
        }

        const length = 32;
        const gap = 4;

        for (let i = 0; i < lines.length - 1; i++) {
            const e1 = lines[i];
            const e2 = lines[i + 1];
            let matched = false;
            const id1 = e1.id;
            const id2 = e2.id;
            for (const ids of arr) {
                if (intersection(ids, [id1, id2]).length === 2) {
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                continue;
            }
            const p1 = e1.start.clone();
            const p2 = e1.end.clone();
            const p3 = e2.end.clone();
            const p4 = p1.clone().sub(p2).normalize().add(p3.clone().sub(p2).normalize());
            const p5 = p2.clone().add(p4);
            const p6 = p2.clone().sub(p4);
            const center = p1.clone().add(p2).divide(2);
            let line: Line;
            if (p5.distanceTo(center) > p6.distanceTo(center)) {
                line = new Line(p5, p2);
            } else {
                line = new Line(p6, p2);
            }
            const theta = line.theta.rad;
            line.end.sub(new Point(Math.cos(theta), Math.sin(theta)).multiply(gap));
            line.start.copy(line.end.clone().sub(new Point(Math.cos(theta), Math.sin(theta)).multiply(length)));
            const leader = new CadLeader();
            leader.vertices = [line.end, line.start];
            leader.size = 15;
            leader.color = new Color("red");
            cad.entities.add(leader);
        }
    }

    private _addDimension(cad: CadData, e: CadLineLike) {
        const dimension = new CadDimension();
        dimension.layer = "line-info";
        dimension.dimstyle = "line-info";
        dimension.distance = 10;
        dimension.font_size = 0;
        dimension.color = new Color("red");
        dimension.entity1 = {id: e.id, location: "start"};
        dimension.entity2 = {id: e.id, location: "end"};

        const texts = [];
        if (this.exportIds) {
            texts.push(`{\\H0.1x;id:${e.id}}`);
        }
        let mingzi = e.mingzi;
        const vars = cad.info.vars;
        if (vars) {
            for (const varName in vars) {
                if (vars[varName] === e.id) {
                    mingzi = varName;
                }
            }
        }
        const {qujian, gongshi} = e;
        const qujianMatch = qujian.match(/(\d+)[~-](\d+)/);
        let mingziAdded = false;
        if (qujianMatch) {
            const [left, right] = qujianMatch.slice(1);
            const leftNum = Number(left);
            const rightNum = Number(right);
            if (!isNaN(leftNum) && leftNum <= 0) {
                texts.push(`${mingzi}<=${right}`);
            } else if (!isNaN(rightNum) && rightNum >= 9999) {
                texts.push(`${mingzi}>=${left}`);
            } else {
                texts.push(`${mingzi}=${left}-${right}`);
            }
            mingziAdded = true;
        }
        if (gongshi) {
            texts.push(`${mingzi}=${gongshi}`);
            mingziAdded = true;
        }
        if (!mingziAdded) {
            texts.push(mingzi);
        }
        if (e.children.line.find((v) => v.宽高虚线)) {
            texts.push("显示斜线宽高");
        }
        if (e.显示线长) {
            texts.push(`显示线长: ${e.显示线长}`);
        }
        dimension.mingzi = texts.join("\n");
        if (dimension.mingzi.length > 0) {
            const e2 = e instanceof CadLine ? e : new CadLine({start: e.start, end: e.end});
            if (e2.isHorizontal()) {
                dimension.axis = "x";
            } else if (e2.isVertical()) {
                dimension.axis = "y";
            }
            cad.entities.add(dimension);
        }
    }

    private async _joinCad(ids: string[]) {
        const result = new CadData();
        const total = ids.length;
        const margin = 300;
        const padding = 80;
        const step = 5;
        const width = 855;
        const height = 1700;
        const cols = 10;

        const join = (cad: CadData, i: number) => {
            this._addLeaders(cad);
            const rect = cad.getBoundingRect();
            const offsetX = (i % cols) * (width + margin);
            const offsetY = -Math.floor(i / cols) * (height + margin);
            const translate = new Point(offsetX + (width - rect.width - padding * 2) / 2, offsetY + height - padding);
            translate.sub(rect.left, rect.top);
            cad.transform({translate}, true);
            rect.transform({translate});

            const texts = [`唯一码: ${cad.info.唯一码}`];
            for (const key in fields) {
                const value = cad[fields[key]];
                if (typeof value === "string" && value) {
                    texts.push(`${key}: ${value}`);
                } else if (typeof value === "boolean") {
                    texts.push(`${key}: ${value ? "是" : "否"}`);
                }
            }
            texts.push(`条件: ${cad.conditions.join(",")}`);
            for (const optionName in cad.options) {
                texts.push(`${optionName}: ${cad.options[optionName]}`);
            }
            const zhankai = cad.zhankai[0] ?? new CadZhankai();
            texts.push(`展开高: ${zhankai.zhankaigao}`);
            texts.push(`展开宽: ${zhankai.zhankaikuan}`);
            if (cad.shuangxiangzhewan) {
                texts.push("双向折弯: 是");
            }
            if (cad.info.修改包边正面宽规则) {
                texts.push(`\n修改包边正面宽规则: \n${cad.info.修改包边正面宽规则}`);
            }
            if (cad.info.锁边自动绑定可搭配铰边) {
                texts.push(`锁边自动绑定可搭配铰边: \n${cad.info.锁边自动绑定可搭配铰边}`);
            }
            cad.entities.add(
                new CadMtext({
                    text: texts.join("\n"),
                    insert: [offsetX + padding, rect.bottom - padding],
                    anchor: [0, 0]
                })
            );

            const {line: lines, arc: arcs} = cad.getAllEntities();
            [...lines, ...arcs].forEach((e) => this._addDimension(cad, e));

            [
                [0, 0, width, 0],
                [width, 0, width, height],
                [width, height, 0, height],
                [0, height, 0, 0]
            ].forEach((v) => {
                const start = [v[0] + offsetX, v[1] + offsetY];
                const end = [v[2] + offsetX, v[3] + offsetY];
                cad.entities.add(new CadLine({color: 3, start, end}));
            });

            result.entities.merge(cad.getAllEntities());
        };

        const cads: CadData[] = [];
        for (let i = 0; i < total; i += step) {
            const end = Math.min(total, i + step);
            const currIds = ids.slice(i, end);
            if (i + 1 === end) {
                this.msg = `正在导出数据(${end}/${total})`;
            } else {
                this.msg = `正在导出数据((${i + 1}~${end})/${total})`;
            }
            const data = await this.dataService.queryMongodb({collection: "cad", where: {_id: {$in: currIds}}, genUnqiCode: true});
            data.forEach((v) => cads.push(new CadData(v.json)));
            this.progressBar.forward(end - i);
        }
        const keys: string[] = ["锁边", "铰边", "开启", "包边"];
        cads.sort((a, b) => {
            for (const k of keys) {
                const v1 = a.options[k];
                const v2 = b.options[k];
                if (v1 !== v2) {
                    return v1 > v2 ? 1 : -1;
                }
            }
            if (a.name !== b.name) {
                return a.name > b.name ? 1 : -1;
            }
            return 0;
        }).forEach((v, i) => join(v, i));

        return result;
    }
}
