import {AfterViewInit, Component, ViewChild} from "@angular/core";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgLoading} from "@app/app.common";
import {getCadPreview} from "@app/cad/cad-preview";
import {CadData} from "@lucilor/cad-viewer";
import {timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {lastValueFrom} from "rxjs";

export interface BackupCadsSearchParams {
  name: string;
  time: number;
  limit: number;
  offset: number;
}

export type BackupCadsResult = {cads: {time: number; data: CadData}[]; minTime: number; maxTime: number};

export interface BackupCadsData {
  time: number;
  title: string;
  data: CadData;
  img: string | SafeUrl;
}

@Component({
  selector: "app-backup",
  templateUrl: "./backup.component.html",
  styleUrls: ["./backup.component.scss"]
})
export class BackupComponent implements AfterViewInit {
  data: BackupCadsData[] = [];
  loaderId = "backupLoader";
  searchParams: BackupCadsSearchParams = {name: "", time: -1, limit: 20, offset: 0};
  searchTime = new Date();
  cadsCount = 100;
  pageSizeOptions = [20, 50, 100, 200, 500];
  cads: CadData[] = [];
  @ViewChild("paginator", {read: MatPaginator}) paginator!: MatPaginator;
  minTime = new Date();
  maxTime = new Date();

  constructor(
    private message: MessageService,
    private dataService: CadDataService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private spinner: SpinnerService,
    private status: AppStatusService
  ) {
    (async () => {
      const {id, collection} = this.route.snapshot.queryParams;
      if (id && collection) {
        this.spinner.show(this.loaderId, {text: "正在获取数据"});
        const cads = (await this.dataService.getCad({id, collection})).cads;
        this.spinner.hide(this.loaderId);
        if (cads.length > 0) {
          const cad = cads[0];
          this.searchParams.name = cad.name;
          this.search();
        }
      }
    })();
  }

  async ngAfterViewInit() {
    await lastValueFrom(this.paginator.initialized);
    this.paginator.nextPage();
  }

  async getBackupCads(search: BackupCadsSearchParams) {
    const response = await this.dataService.post("peijian/cad/getBackupCads", search);
    if (response) {
      const result = response.data as {time: number; data: CadData}[];
      result.forEach((v) => {
        v.data = new CadData(v.data);
      });
      return result;
    }
    return null;
  }

  changePage(event: PageEvent) {
    const {pageIndex, pageSize} = event;
    this.searchParams.offset = pageIndex * pageSize;
    this.getData();
  }

  search() {
    this.searchParams.offset = 0;
    this.paginator.pageIndex = 0;
    this.getData();
  }

  async getData() {
    this.searchParams.time = this.searchTime.getTime();
    this.spinner.show(this.loaderId, {text: "正在获取数据"});
    const response = await this.dataService.post<BackupCadsResult>("peijian/cad/getBackupCads", this.searchParams);
    this.spinner.hide(this.loaderId);
    const data = this.dataService.getResponseData(response);
    if (data) {
      this.cadsCount = response?.count || 0;
      this.data.length = 0;
      this.minTime.setTime(data.minTime);
      this.maxTime.setTime(data.maxTime);
      if (this.searchTime.getTime() > data.maxTime) {
        this.searchTime.setTime(data.maxTime);
      }
      for (const v of data.cads) {
        const cadData = new CadData(v.data);
        const item: BackupCadsData = {
          time: v.time,
          title: new Date(v.time).toLocaleString(),
          img: imgLoading,
          data: cadData
        };
        this.data.push(item);
      }
      await timeout();
      const collection = this.status.collection$.value;
      await Promise.all(
        this.data.map(async (v) => {
          const url = await getCadPreview(collection, v.data, {http: this.dataService});
          v.img = this.sanitizer.bypassSecurityTrustUrl(url);
        })
      );
    }
  }

  async restore(i: number) {
    if (!(i >= 0)) {
      return;
    }
    this.spinner.show(this.loaderId, {text: "正在恢复备份"});
    await this.dataService.setCad({collection: "cad", cadData: this.data[i].data, force: true});
    this.spinner.hide(this.loaderId);
  }

  async remove(i: number) {
    if (await this.message.confirm("删除后无法恢复, 是否继续?")) {
      this.spinner.show(this.loaderId, {text: "正在删除备份"});
      const result = await this.dataService.removeBackup(this.data[i].data.name, this.data[i].time);
      this.spinner.hide(this.loaderId);
      if (result) {
        this.getData();
      }
    }
  }

  alertInfo(i: number) {
    const data = this.data[i].data;
    const getSpaces = (n: number) => new Array(n).fill("&nbsp;").join("");
    const optionsStr = Object.keys(data.options)
      .map((v) => `${getSpaces(9)}${v}: ${data.options[v]}`)
      .join("<br>");
    const conditionsStr = data.conditions.map((v) => `${getSpaces(9)}${v}`).join("<br>");
    let content = [`id: ${data.id}`, `分类: ${data.type}`, "选项: ", optionsStr, "条件: ", conditionsStr].join("<br>");
    content = `<div style="padding:10px">${content}</div>`;
    this.message.alert({content, title: data.name});
  }

  resetSearchTime() {
    this.searchTime.setTime(this.maxTime.getTime());
  }
}
