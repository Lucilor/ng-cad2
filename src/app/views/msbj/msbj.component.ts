import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild} from "@angular/core";
import {MatSelectionList} from "@angular/material/list";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {environment} from "@src/environments/environment";
import {ObjectOf, Rectangle} from "@utils";
import {Properties} from "csstype";
import {cloneDeep, random, uniqueId} from "lodash";

const table = "p_menshanbuju" as const;
const dataField = "peizhishuju" as const;

@Component({
  selector: "app-msjgbj",
  templateUrl: "./msbj.component.html",
  styleUrls: ["./msbj.component.scss"]
})
export class MsbjComponent implements AfterViewInit {
  production = environment.production;
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
  @ViewChild("rectContainer") rectContainer?: ElementRef<HTMLDivElement>;
  @ViewChild("listLeft") listLeft?: MatSelectionList;
  @ViewChild("listRight") listRight?: MatSelectionList;

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
    const {id} = this.route.snapshot.queryParams;
    this.id = id;
    await this.generateRects(true);
    const p1 = async () => {
      const result = await this.dataService.tableSelect<{mingzi: string}>({table: "p_gongnengfenlei", fields: ["mingzi"]});
      this.mokuaisAll = result.map((v) => ({name: v.mingzi}));
      this.mokuaisSelected = [];
      this.mokuaisNotSelected = [];
    };
    const p2 = async () => {
      const result = await this.dataService.tableSelect({table, search: {vid: "1"}});
      if (result[0]) {
        this.msbjInfo = {vid: result[0].vid, name: result[0].mingzi, mokuais: {}};
        let mokuais = null;
        try {
          mokuais = JSON.parse(result[0][dataField]);
        } catch (error) {}
        if (mokuais && typeof mokuais === "object") {
          this.msbjInfo.mokuais = mokuais;
        }
      }
    };
    this.spinner.show(this.spinner.defaultLoaderId);
    await Promise.all([p1(), p2()]);
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
            color = "#" + random(1, 0xffffff - 1).toString(16);
          } while (list.includes(color));
          infoRelative.bgColor = color;
          rectColors[infoRelative.vid] = color;
        }
      }
      this.rectInfosRelative.push(infoRelative);
    });
    const el = this.rectContainer?.nativeElement;
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
      if (mokuais.includes(mokuai.name)) {
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
    const mokuais = this.mokuaisSelected.map((v) => v.name);
    if (mokuais.length > 0) {
      msbjInfo.mokuais[currRectInfo.vid] = mokuais;
    } else {
      delete msbjInfo.mokuais[currRectInfo.vid];
    }
  }

  selectMokuai() {
    const name = this.listRight?.selectedOptions.selected[0]?.value;
    const {mokuaisNotSelected, mokuaisSelected} = this;
    const i = mokuaisNotSelected.findIndex((v) => v.name === name);
    if (i >= 0) {
      mokuaisSelected.push(mokuaisNotSelected.splice(i, 1)[0]);
      this.updateCurrRectInfo();
      this.changeDetector.detectChanges();
    }
  }

  deselectMokuai() {
    const name = this.listLeft?.selectedOptions.selected[0]?.value;
    const {mokuaisAll, mokuaisNotSelected, mokuaisSelected} = this;
    const i = mokuaisSelected.findIndex((v) => v.name === name);
    if (i >= 0) {
      mokuaisNotSelected.push(mokuaisSelected.splice(i, 1)[0]);
      const getIndex = (mokuai: MsbjMokuai) => mokuaisAll.findIndex((v) => v.name === mokuai.name);
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
    const {msbjInfo} = this;
    if (!msbjInfo) {
      return;
    }
    const tableData: TableUpdateParams["tableData"] = {vid: msbjInfo.vid};
    tableData[dataField] = JSON.stringify(msbjInfo.mokuais);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }
}

export interface MsbjInfo {
  vid: string;
  name: string;
  mokuais: ObjectOf<string[]>;
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
    this.rect = new Rectangle([x , y  ], [x + w , y+h ]);
  }
}

export interface MsbjMokuai {
  name: string;
  selected?: boolean;
}
