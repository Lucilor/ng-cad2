import {Component, OnInit} from "@angular/core";
import {AbstractControl} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {session} from "@app/app.common";
import {CadPortable, ExportType} from "@app/cad.portable";
import {CadData} from "@cad-viewer";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf, ProgressBar} from "@utils";

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
    sourceCad?: CadData;
    xinghaoInfo?: ObjectOf<any>;

    constructor(private dialog: MatDialog, private dataService: CadDataService, private message: MessageService) {}

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
        const finish = (progressBarStatus: ProgressBarStatus, msg?: string) => {
            this.progressBar.end();
            this.progressBarStatus = progressBarStatus;
            this.msg = typeof msg === "string" ? msg : "";
        };
        switch (type) {
            case "包边正面":
                ids = await this._queryIds({$or: [{分类: "包边正面"}, {分类2: "包边正面"}]});
                break;
            case "框型和企料":
                ids = await this._queryIds({
                    $or: [
                        {分类: {$regex: "^锁企料|扇锁企料|小锁料|中锁料|铰企料|中铰料$"}},
                        {分类2: {$regex: "^锁企料|扇锁企料|小锁料|中锁料|铰企料|中铰料$"}}
                    ]
                });
                break;
            case "指定型号": {
                const xinghao = await this.message.prompt({
                    title: "请输入型号",
                    promptData: {
                        type: "text",
                        placeholder: "请输入型号",
                        validators: (control: AbstractControl) => {
                            if (!control.value) {
                                return {required: true};
                            }
                            return null;
                        }
                    }
                });
                if (!xinghao) {
                    finish("hidden");
                    return;
                }
                const response = await this.dataService.post<{cad: ObjectOf<any>; xinghaoInfo: ObjectOf<any>}>("ngcad/getImportDxf", {
                    xinghao
                });
                if (response && response.code === 0 && response.data) {
                    this.xinghaoInfo = response.data.xinghaoInfo;
                    try {
                        this.sourceCad = new CadData(response.data.cad);
                    } catch (error) {
                        finish("error", "CAD数据错误");
                        return;
                    }
                } else {
                    finish("error", this.dataService.lastResponse?.msg || "读取文件失败");
                    return;
                }
                ids = await this._queryIds({"选项.型号": {$regex: `^${xinghao}$`}});
                break;
            }
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
            const total = ids.length;
            const step = 20;
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
            const {exportIds, sourceCad, xinghaoInfo} = this;
            const result = CadPortable.export({cads, type, exportIds, sourceCad, xinghaoInfo});
            this.msg = "正在下载dxf文件";
            const downloadResult = await this.dataService.downloadDxf(result);
            if (downloadResult) {
                finish("success", "导出成功");
            } else {
                finish("error", "导出失败");
            }
        } else {
            finish("error", "没有CAD数据");
        }
    }
}
