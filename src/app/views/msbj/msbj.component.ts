import {AfterViewInit, Component, ElementRef, ViewChild} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {Properties} from "csstype";
import {cloneDeep, random} from "lodash";
import {ObjectOf, Rectangle} from "@utils";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {environment} from "@src/environments/environment";

@Component({
  selector: "app-msjgbj",
  templateUrl: "./msbj.component.html",
  styleUrls: ["./msbj.component.scss"]
})
export class MsbjComponent implements AfterViewInit {
  production = environment.production;
  id = "";
  rectInfosRaw: MsbjRectInfoRaw[] = [];
  rectInfosAbsolute: MsbjRectInfo[] = [];
  rectInfosRelative: MsbjRectInfo[] = [];
  rectColors: ObjectOf<string> = {};
  @ViewChild("rectContainer") rectContainer?: ElementRef<HTMLDivElement>;

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private message: MessageService,
    private spinner: SpinnerService
  ) {}

  async ngAfterViewInit() {
    const {id} = this.route.snapshot.queryParams;
    if (!id) {
      this.message.error("缺少id");
      return;
    }
    this.id = id;
    await this.generateRects(true);
    this.spinner.show(this.spinner.defaultLoaderId);
    const result = await this.dataService.queryMySql({table: "p_menshanbuju", filter: {vid: "1"}, limit: 1, page: 1});
    this.spinner.hide(this.spinner.defaultLoaderId);
    console.log(result);
    window.addEventListener("resize", () => this.generateRects());
  }

  async generateRects(fetchData?: boolean, resetColors?: boolean) {
    let rectInfosRaw: MsbjRectInfoRaw[];
    if (fetchData) {
      this.spinner.show(this.spinner.defaultLoaderId);
      const response = await this.dataService.post<MsbjRectInfoRaw[]>("ngcad/getMsbjRects", {id: this.id});
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
      const elRect = el.getBoundingClientRect();
      const ratio1 = elRect.width / elRect.height;
      const ratio2 = width / height;
      const padding = [0, 0, 0, 0];
      if (ratio1 > ratio2) {
        const diff = (elRect.width - elRect.height * ratio2) / 2;
        padding[1] = diff;
        padding[3] = diff;
      } else {
        const diff = (elRect.height - elRect.width / ratio2) / 2;
        padding[0] = diff;
        padding[2] = diff;
      }
      el.style.padding = `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`;
    }
  }

  getRectStyle(info: MsbjRectInfo): Properties {
    const {rect, bgColor} = info;
    return {
      left: `${rect.min.x * 100}%`,
      bottom: `${rect.min.y * 100}%`,
      width: `${rect.width * 100}%`,
      height: `${rect.height * 100}%`,
      backgroundColor: bgColor
    };
  }
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
  vid: number;
  isBuju: boolean;
  rect: Rectangle;
  bgColor?: string;

  constructor(data: MsbjRectInfoRaw) {
    this.vid = data.vid;
    this.isBuju = data.isBuju;
    const {x, y} = data.rect.origin;
    const {w, h} = data.rect.size;
    this.rect = new Rectangle([x - w / 2, y - h / 2], [x + w / 2, y + h / 2]);
  }
}
