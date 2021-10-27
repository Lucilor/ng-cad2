import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {session} from "@app/app.common";
import {CadPortable} from "@app/cad.portable";
import {CadData} from "@cad-viewer";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ObjectOf, ProgressBar} from "@utils";

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
            const total = ids.length;
            const step = 5;
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
            try {
                const data = CadPortable.export(cads, this.exportIds);
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
}
