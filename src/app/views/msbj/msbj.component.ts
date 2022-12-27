import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {AfterViewInit, ChangeDetectorRef, Component, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectionList} from "@angular/material/list";
import {ActivatedRoute} from "@angular/router";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {QueryMysqlParams, TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {environment} from "@src/environments/environment";
import {MsbjInfo, MsbjRectInfo, MsbjFenlei, MsbjData} from "./msbj.types";

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
    private dialog: MatDialog
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
    const rectInfos = this.msbjRects?.rectInfosRelative.filter((v) => v.raw.isBuju).map((v) => v.raw);
    tableData[this.dataField] = JSON.stringify(rectInfos);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  async editFormulas() {
    const info = this.msbjRects?.currRectInfo;
    if (!info) {
      this.message.error("没有选中矩形");
      return;
    }
    const result = await openEditFormulasDialog(this.dialog, {data: {formulas: info.raw.模块大小关系}});
    if (result) {
      info.raw.模块大小关系 = result;
    }
  }
}