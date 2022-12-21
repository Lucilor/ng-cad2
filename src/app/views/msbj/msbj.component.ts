import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectionList} from "@angular/material/list";
import {ActivatedRoute} from "@angular/router";
import {openEditFormulasDialog} from "@components/dialogs/edit-formulas-dialog/edit-formulas-dialog.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {QueryMysqlParams, TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {Formulas} from "@src/app/utils/calc";
import {environment} from "@src/environments/environment";
import {ObjectOf, Rectangle} from "@utils";
import {Properties} from "csstype";
import {cloneDeep, random, uniqueId} from "lodash";

@Component({
  selector: "app-msjgbj",
  templateUrl: "./msbj.component.html",
  styleUrls: ["./msbj.component.scss"]
})
export class MsbjComponent implements AfterViewInit, OnDestroy {
  production = environment.production;
  table = "";
  id = "";
  msbjInfo: MsbjInfo | null = null;
  rectInfosAbsolute: MsbjRectInfo[] = [];
  rectInfosRelative: MsbjRectInfo[] = [];
  rectColors: ObjectOf<string> = {};
  currRectInfo: MsbjRectInfo | null = null;
  fenleisAll: MsbjFenlei[] = [];
  fenleisSelected: MsbjFenlei[] = [];
  fenleisNotSelected: MsbjFenlei[] = [];
  dataField: keyof Omit<MsbjTableData, keyof TableDataBase> = "peizhishuju";
  fenleiListDataType!: {$implicit: MsbjFenlei[]; class: string};
  rgbMin = 200;
  rgbMax = 245;
  altColors = [
    "rgb(231, 224, 200)",
    "rgb(218, 235, 202)",
    "rgb(240, 203, 230)",
    "rgb(234, 205, 230)",
    "rgb(208, 215, 243)",
    "rgb(211, 201, 201)",
    "rgb(219, 205, 212)",
    "rgb(245, 228, 239)",
    "rgb(231, 212, 203)",
    "rgb(237, 229, 223)"
  ];
  multiSelect = true;
  @ViewChild("rectOuter") rectOuter?: ElementRef<HTMLDivElement>;
  @ViewChildren("fenleiList") fenleiLists?: QueryList<MatSelectionList>;
  get fenleiListSelected() {
    return this.fenleiLists?.find((v) => v._element.nativeElement.classList.contains("selected"));
  }
  get fenleiListNotSelected() {
    return this.fenleiLists?.find((v) => v._element.nativeElement.classList.contains("not-selected"));
  }

  private _onWindowResize = (() => {
    this.generateRects();
  }).bind(this);

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
    this.multiSelect = this.dataField === "peizhishuju";
    this.spinner.show(this.spinner.defaultLoaderId);
    const params: QueryMysqlParams = {table: "p_gongnengfenlei", fields: ["mingzi"]};
    if (this.msbjInfo?.menshanbuju) {
      params.filter = {where: {vid: this.msbjInfo.menshanbuju}};
    }
    const fenleis = await this.dataService.queryMySql(params);
    this.fenleisAll = fenleis.map((v) => ({...v, selected: false}));
    this.fenleisSelected = [];
    this.fenleisNotSelected = [];

    const msbjData = await this.dataService.queryMySql<MsbjTableData>({table, filter: {where: {vid: this.id}}});
    if (msbjData[0]) {
      this.msbjInfo = {
        vid: msbjData[0].vid,
        name: msbjData[0].mingzi,
        multiSelect: this.dataField === "peizhishuju",
        menshanbuju: msbjData[0].menshanbuju,
        rectInfos: []
      };
      let rectInfos1: MsbjRectInfoRaw[] | null = null;
      try {
        rectInfos1 = window.node2rect(JSON.parse(msbjData[0].node || ""));
      } catch (error) {}
      let rectInfos2: MsbjRectInfoRaw[] | null = null;
      try {
        rectInfos2 = JSON.parse(msbjData[0][this.dataField] || "");
      } catch (error) {}
      if (rectInfos1) {
        for (const info1 of rectInfos1) {
          info1.可选模块分类 = fenleis.map((v) => v.vid);
          const info2 = rectInfos2?.find((v) => v.vid === info1.vid);
          if (info2) {
            Object.assign(info1, info2);
          }
        }
        this.msbjInfo.rectInfos = rectInfos1.map((v) => ({...v, selected: false}));
      }
    } else {
      this.msbjInfo = null;
    }
    this.spinner.hide(this.spinner.defaultLoaderId);

    this.generateRects(true);
    window.addEventListener("resize", this._onWindowResize);
  }

  ngOnDestroy() {
    window.removeEventListener("resize", this._onWindowResize);
  }

  generateRects(resetColors?: boolean) {
    this.rectInfosAbsolute = [];
    this.rectInfosRelative = [];
    const totalRect = Rectangle.min;
    const names = new Set<string>();
    this.msbjInfo?.rectInfos.forEach((infoRaw) => {
      const infoAbsolute = new MsbjRectInfo(infoRaw);
      this.rectInfosAbsolute.push(infoAbsolute);
      totalRect.expandByRect(infoAbsolute.rect);
      if (infoAbsolute.raw.mingzi) {
        names.add(infoAbsolute.raw.mingzi);
      }
    });
    const {width, height, left, bottom} = totalRect;
    if (resetColors) {
      this.rectColors = {};
    }
    const rectColors = this.rectColors;
    const randRGB = () => random(this.rgbMin, this.rgbMax);
    let i = 0;
    const altColors = this.altColors;
    const randColor = () => {
      if (i < altColors.length) {
        return altColors[i++];
      }
      return `rgb(${randRGB()}, ${randRGB()}, ${randRGB()})`;
    };
    let charCode = 65;
    this.rectInfosAbsolute.forEach((infoAbsolute) => {
      const infoRelative = cloneDeep(infoAbsolute);
      const {min, max} = infoRelative.rect;
      min.set((min.x - left) / width, (min.y - bottom) / height);
      max.set((max.x - left) / width, (max.y - bottom) / height);
      const raw = infoRelative.raw;
      if (raw.isBuju) {
        if (rectColors[raw.vid]) {
          infoRelative.bgColor = rectColors[raw.vid];
        } else {
          let color: string;
          const list = Object.values(rectColors);
          do {
            color = randColor();
          } while (list.includes(color));
          infoRelative.bgColor = color;
          rectColors[raw.vid] = color;
        }
        if (!raw.mingzi) {
          let mingzi: string;
          do {
            mingzi = String.fromCharCode(charCode++);
          } while (names.has(mingzi));
          raw.mingzi = mingzi;
        }
      }
      this.rectInfosRelative.push(infoRelative);
    });
    const el = this.rectOuter?.nativeElement;
    if (el) {
      const padding = [10, 10, 10, 10];
      const elRect = el.getBoundingClientRect();
      const ratio1 = (elRect.width - padding[1] - padding[3]) / (elRect.height - padding[0] - padding[2]);
      const ratio2 = width / height;
      if (ratio1 > ratio2) {
        const diff = (elRect.width - elRect.height * ratio2) / 2;
        padding[1] += diff;
        padding[3] += diff;
      } else {
        const diff = (elRect.height - elRect.width / ratio2) / 2;
        padding[0] += diff;
        padding[2] += diff;
      }
      el.style.padding = `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`;
    }
  }

  getRectStyle(info: MsbjRectInfo): Properties {
    const {rect, bgColor} = info;
    return {
      left: `${rect.min.x * 100}%`,
      top: `${rect.min.y * 100}%`,
      width: `${rect.width * 100}%`,
      height: `${rect.height * 100}%`,
      backgroundColor: bgColor
    };
  }

  setCurrRectInfo(info: MsbjRectInfo | null) {
    const {fenleisSelected, fenleisNotSelected} = this;
    fenleisSelected.length = 0;
    fenleisNotSelected.length = 0;
    if (info?.raw.isBuju) {
      this.currRectInfo = info;
      const fenleis = info.raw.选中模块分类 || [];
      this.fenleisAll.forEach((fenlei) => {
        if (fenleis.includes(fenlei.vid)) {
          fenleisSelected.push(fenlei);
        } else {
          fenleisNotSelected.push(fenlei);
        }
      });
    } else {
      this.currRectInfo = null;
    }
  }

  updateCurrRectInfo() {
    const {currRectInfo} = this;
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
    const tableData: TableUpdateParams<MsbjTableData>["tableData"] = {vid: msbjInfo.vid};
    const rectInfos = this.rectInfosRelative.filter((v) => v.raw.isBuju).map((v) => v.raw);
    tableData[this.dataField] = JSON.stringify(rectInfos);
    console.log(rectInfos);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  async editFormulas() {
    const info = this.currRectInfo;
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

export interface MsbjInfo {
  vid: number;
  name: string;
  multiSelect: boolean;
  menshanbuju?: string;
  rectInfos: MsbjRectInfoRaw[];
}

export interface MsbjRectInfoRaw {
  vid: number;
  isBuju: boolean;
  rect: {
    origin: {
      x: number;
      y: number;
    };
    size: {
      w: number;
      h: number;
    };
  };
  mingzi?: string;
  可选模块分类?: number[];
  选中模块分类?: number[];
  选中模块?: number[];
  模块大小关系?: Formulas;
}

export class MsbjRectInfo {
  id: string;
  rect: Rectangle;
  bgColor?: string;

  constructor(public raw: MsbjRectInfoRaw) {
    this.id = uniqueId();
    const {x, y} = raw.rect.origin;
    const {w, h} = raw.rect.size;
    this.rect = new Rectangle([x, y], [x + w, y + h]);
  }
}

export interface MsbjFenlei extends TableDataBase {
  selected?: boolean;
}

export interface MsbjTableData extends TableDataBase {
  peizhishuju?: string;
  menshanbuju?: string;
  menshanbujumorenfenlei?: string;
  node?: string;
}
