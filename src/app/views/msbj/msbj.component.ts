import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {AfterViewInit, ChangeDetectorRef, Component, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MatSelectionList} from "@angular/material/list";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {imgEmpty, setGlobal} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData} from "@cad-viewer";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {QueryMysqlParams, TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {MsbjInfo, MsbjFenlei, MsbjData} from "./msbj.types";

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
  fenleisAll: MsbjFenlei[] = [];
  fenleisSelected: MsbjFenlei[] = [];
  fenleisNotSelected: MsbjFenlei[] = [];
  dataField: keyof Omit<MsbjData, keyof TableDataBase> = "peizhishuju";
  fenleiListDataType!: {$implicit: MsbjFenlei[]; class: string};
  nameInputInfo: InputInfo = {
    type: "string",
    label: "名字",
    readonly: true
  };
  cads: {data: CadData; img: SafeUrl}[] = [];
  @ViewChild(MsbjRectsComponent) msbjRects?: MsbjRectsComponent;
  @ViewChildren("fenleiList") fenleiLists?: QueryList<MatSelectionList>;
  get fenleiListSelected() {
    return this.fenleiLists?.find((v) => v._element.nativeElement.classList.contains("selected"));
  }
  get fenleiListNotSelected() {
    return this.fenleiLists?.find((v) => v._element.nativeElement.classList.contains("not-selected"));
  }

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private message: MessageService,
    private spinner: SpinnerService,
    private changeDetector: ChangeDetectorRef,
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
    const params: QueryMysqlParams = {table: "p_gongnengfenlei", fields: ["mingzi"]};
    if (this.msbjInfo?.menshanbuju) {
      params.filter = {where: {vid: this.msbjInfo.menshanbuju}};
    }
    const fenleis = await this.dataService.queryMySql(params);
    this.fenleisAll = fenleis.map((v) => ({...v, selected: false}));
    this.fenleisSelected = [];
    this.fenleisNotSelected = [];

    const msbjData = await this.dataService.queryMySql<MsbjData>({table, filter: {where: {vid: this.id}}});
    if (msbjData[0]) {
      this.msbjInfo = new MsbjInfo(msbjData[0], this.dataField, fenleis);
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

  generateRects(resetColors?: boolean) {
    this.msbjRects?.generateRects(resetColors);
  }

  setCurrRectInfo(info: MsbjRectInfo | null) {
    const {fenleisSelected, fenleisNotSelected, nameInputInfo} = this;
    fenleisSelected.length = 0;
    fenleisNotSelected.length = 0;
    if (info?.raw.isBuju) {
      const fenleis = info.raw.选中模块分类 || [];
      this.fenleisAll.forEach((fenlei) => {
        if (fenleis.includes(fenlei.vid)) {
          fenleisSelected.push(fenlei);
        } else {
          fenleisNotSelected.push(fenlei);
        }
      });
      nameInputInfo.readonly = false;
      nameInputInfo.model = {data: info.raw, key: "mingzi"};
    } else {
      nameInputInfo.readonly = true;
      delete nameInputInfo.model;
    }
  }

  updateCurrRectInfo() {
    const currRectInfo = this.msbjRects?.currRectInfo;
    if (!currRectInfo) {
      return;
    }
    currRectInfo.raw.选中模块分类 = this.fenleisSelected.map((v) => v.vid);
  }

  sortFenleis(fenleis: MsbjFenlei[]) {
    const {fenleisAll} = this;
    const getIndex = (fenlei: MsbjFenlei) => fenleisAll.findIndex((v) => v.vid === fenlei.vid);
    fenleis.sort((a, b) => getIndex(a) - getIndex(b));
  }

  selectFenlei(i: number) {
    const {fenleisNotSelected, fenleisSelected} = this;
    fenleisSelected.push(fenleisNotSelected.splice(i, 1)[0]);
    this.sortFenleis(fenleisSelected);
    this.updateCurrRectInfo();
    this.changeDetector.detectChanges();
  }

  deselectFenlei(i: number) {
    const {fenleisNotSelected, fenleisSelected} = this;
    fenleisNotSelected.push(fenleisSelected.splice(i, 1)[0]);
    this.sortFenleis(fenleisNotSelected);
    this.updateCurrRectInfo();
    this.changeDetector.detectChanges();
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
    const tableData: TableUpdateParams<MsbjData>["tableData"] = {vid: msbjInfo.vid};
    const rectInfos = this.msbjRects?.rectInfosRelative.map((v) => v.raw);
    msbjInfo.peizhishuju.模块节点 = rectInfos || [];
    tableData[this.dataField] = JSON.stringify(msbjInfo.peizhishuju);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
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
