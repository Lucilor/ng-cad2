import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MatSelectionList} from "@angular/material/list";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {QueryMysqlParams, TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {environment} from "@src/environments/environment";
import {ObjectOf, Rectangle} from "@utils";
import {Properties} from "csstype";
import {cloneDeep, random, uniqueId} from "lodash";

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
  rectInfosRaw: MsbjRectInfoRaw[] = [];
  rectInfosAbsolute: MsbjRectInfo[] = [];
  rectInfosRelative: MsbjRectInfo[] = [];
  rectColors: ObjectOf<string> = {};
  currRectInfo: MsbjRectInfo | null = null;
  mokuaisAll: MsbjMokuai[] = [];
  mokuaisSelected: MsbjMokuai[] = [];
  mokuaisNotSelected: MsbjMokuai[] = [];
  dataField: keyof Omit<MsbjTableData, keyof TableDataBase> = "peizhishuju";
  mokuaiListDataType!: {$implicit: MsbjMokuai[]; class: string};
  rgbMin = 200;
  rgbMax = 245;
  multiSelect = true;
  @ViewChild("rectOuter") rectOuter?: ElementRef<HTMLDivElement>;
  @ViewChildren("mokuaiList") mokuaiLists?: QueryList<MatSelectionList>;
  get mokuaiListSelected() {
    return this.mokuaiLists?.find((v) => v._element.nativeElement.classList.contains("selected"));
  }
  get mokuaiListNotSelected(){
    return this.mokuaiLists?.find((v) => v._element.nativeElement.classList.contains("not-selected"));
  }

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private message: MessageService,
    private spinner: SpinnerService,
    private changeDetector: ChangeDetectorRef
  ) {
    setGlobal("msbj", this);
  }

  async ngAfterViewInit() {
    const {table, id, field} = this.route.snapshot.queryParams;
    this.table = table || "";
    this.id = id || "";
    this.dataField = field === "peizhishuju" ? field : "menshanbujumorenmokuai";
    this.multiSelect = this.dataField === "peizhishuju";
    await this.generateRects(true);
    this.spinner.show(this.spinner.defaultLoaderId);
    const msbjData = await this.dataService.queryMySql<MsbjTableData>({table, filter: {where: {vid: this.id}}});
    if (msbjData[0]) {
      this.msbjInfo = {
        vid: msbjData[0].vid,
        name: msbjData[0].mingzi,
        mokuais: {},
        multiSelect: this.dataField === "peizhishuju",
        menshanbuju: msbjData[0].menshanbuju
      };
      let mokuais = null;
      try {
        mokuais = JSON.parse(msbjData[0][this.dataField] || "");
      } catch (error) {}
      if (mokuais && typeof mokuais === "object") {
        this.msbjInfo.mokuais = mokuais;
      }
    } else {
      this.msbjInfo = null;
    }

    const params: QueryMysqlParams = {table: "p_gongnengfenlei", fields: ["mingzi"]};
    if (this.msbjInfo?.menshanbuju) {
      params.filter = {where: {vid: this.msbjInfo.menshanbuju}};
    } else {
    }
    const fenleis = await this.dataService.queryMySql(params);
    this.mokuaisAll = fenleis.map((v) => ({...v, selected: false}));
    this.mokuaisSelected = [];
    this.mokuaisNotSelected = [];
    this.spinner.hide(this.spinner.defaultLoaderId);
    window.addEventListener("resize", () => this.generateRects());
  }

  async generateRects(fetchData?: boolean, resetColors?: boolean) {
    let rectInfosRaw: MsbjRectInfoRaw[];
    if (fetchData) {
      this.spinner.show(this.spinner.defaultLoaderId);
      const response = await this.dataService.post<MsbjRectInfoRaw[]>("ngcad/getMsbjRects", {id: this.id}, {testData: "rectInfos"});
      this.spinner.hide(this.spinner.defaultLoaderId);
      rectInfosRaw = response?.data || [];
      this.rectInfosRaw = rectInfosRaw;
    } else {
      rectInfosRaw = this.rectInfosRaw;
    }
    this.rectInfosAbsolute = [];
    this.rectInfosRelative = [];
    const totalRect = Rectangle.min;
    rectInfosRaw.forEach((infoRaw) => {
      const infoAbsolute = new MsbjRectInfo(infoRaw);
      this.rectInfosAbsolute.push(infoAbsolute);
      totalRect.expandByRect(infoAbsolute.rect);
    });
    const {width, height, left, bottom} = totalRect;
    if (resetColors) {
      this.rectColors = {};
    }
    const rectColors = this.rectColors;
    const randRGB = () => random(this.rgbMin, this.rgbMax);
    this.rectInfosAbsolute.forEach((infoAbsolute) => {
      const infoRelative = cloneDeep(infoAbsolute);
      const {min, max} = infoRelative.rect;
      min.set((min.x - left) / width, (min.y - bottom) / height);
      max.set((max.x - left) / width, (max.y - bottom) / height);
      if (infoRelative.isBuju) {
        if (rectColors[infoRelative.vid]) {
          infoRelative.bgColor = rectColors[infoRelative.vid];
        } else {
          let color: string;
          const list = Object.values(rectColors);
          do {
            color = `rgb(${randRGB()}, ${randRGB()}, ${randRGB()})`;
          } while (list.includes(color));
          infoRelative.bgColor = color;
          rectColors[infoRelative.vid] = color;
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

  onRectClick(info: MsbjRectInfo) {
    if (!info.isBuju) {
      return;
    }
    this.rectInfosRelative.forEach((v) => (v.active = false));
    this.currRectInfo = info;
    info.active = true;
    const mokuais = this.msbjInfo?.mokuais[info.vid] || [];
    const {mokuaisSelected, mokuaisNotSelected} = this;
    mokuaisSelected.length = 0;
    mokuaisNotSelected.length = 0;
    this.mokuaisAll.forEach((mokuai) => {
      if (mokuais.includes(mokuai.vid)) {
        mokuaisSelected.push(mokuai);
      } else {
        mokuaisNotSelected.push(mokuai);
      }
    });
  }

  updateCurrRectInfo() {
    const {msbjInfo, currRectInfo} = this;
    if (!msbjInfo || !currRectInfo) {
      return;
    }
    const mokuais = this.mokuaisSelected.map((v) => v.vid);
    if (mokuais.length > 0) {
      msbjInfo.mokuais[currRectInfo.vid] = mokuais;
    } else {
      delete msbjInfo.mokuais[currRectInfo.vid];
    }
  }

  selectMokuai() {
    const vid = this.mokuaiListNotSelected?.selectedOptions.selected[0]?.value;
    const {mokuaisNotSelected, mokuaisSelected} = this;
    const i = mokuaisNotSelected.findIndex((v) => v.vid === vid);
    if (i >= 0) {
      mokuaisSelected.push(mokuaisNotSelected.splice(i, 1)[0]);
      this.updateCurrRectInfo();
      this.changeDetector.detectChanges();
    }
  }

  deselectMokuai() {
    const vid = this.mokuaiListSelected?.selectedOptions.selected[0]?.value;
    const {mokuaisAll, mokuaisNotSelected, mokuaisSelected} = this;
    const i = mokuaisSelected.findIndex((v) => v.vid === vid);
    if (i >= 0) {
      mokuaisNotSelected.push(mokuaisSelected.splice(i, 1)[0]);
      const getIndex = (mokuai: MsbjMokuai) => mokuaisAll.findIndex((v) => v.vid === mokuai.vid);
      mokuaisNotSelected.sort((a, b) => getIndex(a) - getIndex(b));
      this.updateCurrRectInfo();
      this.changeDetector.detectChanges();
    }
  }

  dropMokuai(event: CdkDragDrop<MsbjMokuai[]>) {
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
    tableData[this.dataField] = JSON.stringify(msbjInfo.mokuais);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }
}

export interface MsbjInfo {
  vid: number;
  name: string;
  mokuais: ObjectOf<number[]>;
  multiSelect: boolean;
  menshanbuju?: string;
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
}

export class MsbjRectInfo {
  id: string;
  vid: number;
  isBuju: boolean;
  rect: Rectangle;
  bgColor?: string;
  active = false;

  constructor(data: MsbjRectInfoRaw) {
    this.id = uniqueId();
    this.vid = data.vid;
    this.isBuju = data.isBuju;
    const {x, y} = data.rect.origin;
    const {w, h} = data.rect.size;
    this.rect = new Rectangle([x, y], [x + w, y + h]);
  }
}

export interface MsbjMokuai extends TableDataBase {
  selected?: boolean;
}

export interface MsbjTableData extends TableDataBase {
  peizhishuju?: string;
  menshanbuju?: string;
  menshanbujumorenmokuai?: string;
}
