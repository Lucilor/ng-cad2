import {Component, OnInit} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {session, setGlobal} from "@app/app.common";
import {CadExportParams, CadPortable, CadSourceParams, ExportType} from "@app/cad/portable";
import {openCadListDialog} from "@components/dialogs/cad-list/cad-list.component";
import {ProgressBarStatus} from "@components/progress-bar/progress-bar.component";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf, ProgressBar} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {DateTime} from "luxon";

interface ExportCache {
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
  exportCache: ExportCache | null = null;
  direct = false;
  exportParams: CadExportParams = {cads: [], type: "自由选择", exportId: environment.production, exportUniqCode: true};

  constructor(
    private dialog: MatDialog,
    private dataService: CadDataService,
    private message: MessageService,
    private status: AppStatusService
  ) {
    setGlobal("exporter", this);
  }

  ngOnInit() {
    this.exportCache = session.load<ExportCache>("exportParams");
    this.direct = !!this.exportCache?.direct;
    // session.remove("exportParams");
    if (this.direct) {
      this.exportCads("导出选中");
    } else if (this.exportCache) {
      const ids = this.exportCache.ids;
      if (!Array.isArray(ids) || ids.length < 1) {
        this.exportCache = null;
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
    this.exportParams.type = type;
    delete this.exportParams.sourceParams;
    let filename: string;
    switch (type) {
      case "包边正面":
        ids = await this._queryIds({$or: [{分类: "包边正面"}, {分类2: "包边正面"}]});
        filename = "包边正面";
        break;
      case "框型":
        ids = await this._queryIds({
          $or: [{分类: {$regex: "^中横框|锁框|铰框|顶框|底框$"}}, {分类2: {$regex: "^中横框|锁框|铰框|顶框|底框$"}}]
        });
        filename = "框型";
        break;
      case "企料":
        ids = await this._queryIds({
          $or: [
            {分类: {$regex: "^锁企料|扇锁企料|小锁料|中锁料|铰企料|中铰料$"}},
            {分类2: {$regex: "^锁企料|扇锁企料|小锁料|中锁料|铰企料|中铰料$"}}
          ]
        });
        filename = "企料";
        break;
      case "框型和企料":
        ids = await this._queryIds({
          $or: [
            {分类: {$regex: "^中横框|锁框|铰框|顶框|底框|锁企料|扇锁企料|小锁料|中锁料|铰企料|中铰料$"}},
            {分类2: {$regex: "^中横框|锁框|铰框|顶框|底框|锁企料|扇锁企料|小锁料|中锁料|铰企料|中铰料$"}}
          ]
        });
        filename = "框型和企料";
        break;
      case "企料分体":
        ids = await this._queryIds({
          $or: [{名字: {$regex: "分体1|分体2"}}]
        });
        filename = "企料分体";
        break;
      case "指定型号": {
        const xinghao = await this.message.prompt({
          type: "string",
          label: "指定型号",
          validators: Validators.required
        });
        if (!xinghao) {
          finish("hidden");
          return;
        }
        const response = await this.dataService.post<any>("ngcad/getImportDxf", {
          xinghao
        });
        if (response && response.code === 0 && response.data) {
          const xinghaoInfo = response.data.xinghaoInfo;
          let sourceCad: CadData;
          try {
            sourceCad = new CadData(response.data.cad);
          } catch (error) {
            finish("error", "CAD数据错误");
            return;
          }
          const importResult = CadPortable.import({sourceCad});
          const slgses: CadSourceParams["slgses"] = await this.dataService.queryMongodb({
            collection: "material",
            where: {"选项.型号": xinghao}
          });
          this.exportParams.sourceParams = {sourceCad, importResult, xinghaoInfo, slgses};
        } else {
          finish("error", this.dataService.lastResponse?.msg || "读取文件失败");
          return;
        }
        ids = await this._queryIds({$where: `this.选项&&this.选项.型号&&this.选项.型号.split(";").indexOf("${xinghao}")>-1`});
        filename = xinghao;
        break;
      }
      case "自由选择":
        ids = (
          (await openCadListDialog(this.dialog, {
            data: {selectMode: "multiple", collection: "cad", search: {分类: "^.+$"}}
          })) ?? []
        ).map((v) => v.id);
        filename = "自由选择";
        break;
      case "导出选中":
        ids = this.exportCache?.ids || [];
        filename = "导出选中";
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
      this.exportParams.cads = cads;
      let result: CadData | undefined;
      try {
        result = await CadPortable.export(this.exportParams, this.status.getProjectConfig());
      } catch (error) {
        console.error(error);
        finish("error", this.dataService.lastResponse?.msg || "导出失败");
        return;
      }
      this.msg = "正在下载dxf文件";
      filename += `@${DateTime.now().toFormat("yyyy-MM-dd")}.dxf`;
      const downloadResult = await this.dataService.downloadDxf(result, {filename});
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
