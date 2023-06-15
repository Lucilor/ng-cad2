import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {AfterViewInit, Component, ViewChild} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgEmpty, setGlobal} from "@app/app.common";
import {getCadPreview} from "@app/cad/utils";
import {GenerateRectsOpts, MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
import {environment} from "@env";
import {CadData} from "@lucilor/cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {MsbjData, MsbjFenlei, MsbjInfo} from "./msbj.types";

@Component({
  selector: "app-msjgbj",
  templateUrl: "./msbj.component.html",
  styleUrls: ["./msbj.component.scss"]
})
export class MsbjComponent implements AfterViewInit {
  production = environment.production;
  table = "";
  id = "";
  msbjInfo: MsbjInfo | null = null;
  dataField: keyof Omit<MsbjData, keyof TableDataBase> = "peizhishuju";
  fenleiListDataType!: {$implicit: MsbjFenlei[]; class: string};
  nameInputInfo: InputInfo = {
    type: "string",
    label: "名字",
    readonly: true
  };
  cads: {data: CadData; img: SafeUrl}[] = [];
  @ViewChild(MsbjRectsComponent) msbjRects?: MsbjRectsComponent;

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private message: MessageService,
    private spinner: SpinnerService,
    private sanitizer: DomSanitizer,
    private status: AppStatusService
  ) {
    setGlobal("msbj", this);
  }

  async ngAfterViewInit() {
    const {table, id, field} = this.route.snapshot.queryParams;
    this.table = table || "";
    this.id = id || "";
    this.dataField = field === "peizhishuju" ? field : "menshanbujumorenfenlei";
    this.spinner.show(this.spinner.defaultLoaderId);

    const msbjData = await this.dataService.queryMySql<MsbjData>({table, filter: {where: {vid: this.id}}});
    if (msbjData[0]) {
      this.msbjInfo = new MsbjInfo(msbjData[0]);
      const getCadResult = await this.dataService.getCad({collection: "cad", search: {"选项.门扇布局": msbjData[0].mingzi}});
      this.cads = getCadResult.cads.map((data) => {
        const item: MsbjComponent["cads"][number] = {data, img: imgEmpty};
        getCadPreview("cad", data).then((img) => (item.img = this.sanitizer.bypassSecurityTrustUrl(img)));
        return item;
      });
    } else {
      this.msbjInfo = null;
    }
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  generateRects(opts: GenerateRectsOpts) {
    this.msbjRects?.generateRects(opts);
  }

  setCurrRectInfo(info: MsbjRectInfo | null) {
    const {nameInputInfo} = this;
    if (info?.raw.isBuju) {
      nameInputInfo.model = {data: info, key: "name"};
    } else {
      delete nameInputInfo.model;
    }
  }

  updateCurrRectInfo() {
    const currRectInfo = this.msbjRects?.currRectInfo;
    if (!currRectInfo) {
      return;
    }
  }

  dropFenlei(event: CdkDragDrop<MsbjFenlei[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.updateCurrRectInfo();
  }

  async submit() {
    const {msbjInfo, table} = this;
    if (!msbjInfo) {
      return;
    }
    const data: TableUpdateParams<MsbjData>["data"] = {vid: msbjInfo.vid};
    const rectInfos = this.msbjRects?.rectInfosRelative.map((v) => v.raw);
    msbjInfo.peizhishuju.模块节点 = rectInfos || [];
    data[this.dataField] = JSON.stringify(msbjInfo.peizhishuju);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, data});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  async editMokuaidaxiao() {
    const info = this.msbjInfo;
    if (!info) {
      return;
    }
    const result = await this.message.json(info.peizhishuju.模块大小关系);
    if (result) {
      info.peizhishuju.模块大小关系 = result;
    }
  }

  openCad(data: CadData) {
    this.status.openCadInNewTab(data.id, "cad");
  }
}
