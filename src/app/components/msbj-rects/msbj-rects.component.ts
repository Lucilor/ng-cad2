import {Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild} from "@angular/core";
import {Debounce} from "@decorators/debounce";
import {setGlobal} from "@src/app/app.common";
import {ObjectOf, Rectangle, timeout} from "@utils";
import {Properties} from "csstype";
import {cloneDeep, random} from "lodash";
import {MsbjRectInfo, MsbjRectInfoRaw} from "./msbj-rects.types";

@Component({
  selector: "app-msbj-rects",
  templateUrl: "./msbj-rects.component.html",
  styleUrls: ["./msbj-rects.component.scss"]
})
export class MsbjRectsComponent {
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
  rectInfosAbsolute: MsbjRectInfo[] = [];
  rectInfosRelative: MsbjRectInfo[] = [];
  currRectInfo: MsbjRectInfo | null = null;
  padding = [10, 10, 10, 10] as const;
  @ViewChild("rectOuter") rectOuter?: ElementRef<HTMLDivElement>;
  private _rectColors: ObjectOf<string> = {};

  private _rectInfos?: MsbjRectInfoRaw[];
  @Input()
  get rectInfos() {
    return this._rectInfos;
  }
  set rectInfos(value) {
    this._rectInfos = value;
    this.generateRects(true);
  }
  @Input() selectRectBefore?: (info: MsbjRectInfo | null) => boolean;
  @Output() selectRect = new EventEmitter<MsbjRectInfo | null>();
  @Output() generateRectsStart = new EventEmitter<void>();
  @Output() generateRectsEnd = new EventEmitter<void>();

  constructor() {
    setGlobal("msbjRects", this);
  }

  @HostListener("window:resize")
  @Debounce(500)
  onWindowResize() {
    this.generateRects();
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
    if (this.selectRectBefore && !this.selectRectBefore(info)) {
      return;
    }
    if (info?.raw.isBuju) {
      this.currRectInfo = info;
    } else {
      this.currRectInfo = null;
    }
    this.selectRect.emit(info);
  }

  async generateRects(resetColors?: boolean) {
    this.generateRectsStart.emit();
    this.rectInfosAbsolute = [];
    this.rectInfosRelative = [];
    const totalRect = Rectangle.min;
    const names = new Set<string>();
    this.rectInfos?.forEach((infoRaw) => {
      const infoAbsolute = new MsbjRectInfo(infoRaw);
      this.rectInfosAbsolute.push(infoAbsolute);
      totalRect.expandByRect(infoAbsolute.rect);
      if (infoAbsolute.name) {
        names.add(infoAbsolute.name);
      }
    });
    const {width, height, left, bottom} = totalRect;
    if (resetColors) {
      this._rectColors = {};
    }
    const rectColors = this._rectColors;
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
        if (!infoAbsolute.name) {
          let name: string;
          do {
            name = String.fromCharCode(charCode++);
          } while (names.has(name));
          infoAbsolute.name = name;
          infoRelative.name = name;
        }
      }
      this.rectInfosRelative.push(infoRelative);
    });
    const el = this.rectOuter?.nativeElement;
    if (el) {
      const padding = this.padding.slice();
      el.style.padding = "0";
      el.style.opacity = "0";
      await timeout(0);
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
      await timeout(0);
      el.style.opacity = "1";
    }
    this.generateRectsEnd.emit();
  }
}
