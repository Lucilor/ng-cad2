import {AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {AbstractControl, Validators} from "@angular/forms";
import {SafeUrl} from "@angular/platform-browser";
import {CadArc, CadData, CadLine, CadLineLike, sortLines} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/types";
import {getInputValues} from "@modules/input/components/utils";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {CadCollection, setGlobal} from "@src/app/app.common";
import {getCadPreview} from "@src/app/cad.utils";
import {isNearZero, ObjectOf, Point} from "@utils";
import {BehaviorSubject, take} from "rxjs";

@Component({
  selector: "app-index2",
  templateUrl: "./index2.component.html",
  styleUrls: ["./index2.component.scss"]
})
export class Index2Component implements AfterViewInit {
  @ViewChild("contentEl", {read: ElementRef}) contentEl?: ElementRef<HTMLDivElement>;
  stepType$ = new BehaviorSubject(null as Index2StepType | null);
  stepTypes = index2StepTypes;
  leftMenuInputData = {angle: 0, length: 1};
  leftMenuInputInfos: InputInfo[] = [];
  leftMenuCads: {data: CadData; img: SafeUrl; selected: boolean}[] = [];
  inputValues: ObjectOf<any> = {};
  bottomInput = {value: "", output: new BehaviorSubject(""), disabled: true};
  @ViewChild("bottomInputEl") bottomInputEl?: ElementRef<HTMLInputElement>;
  cadData1 = new CadData();
  cadData2 = new CadData();
  cadData3 = new CadData();
  @ViewChildren("stepInputs") stepInputs?: QueryList<InputComponent>;

  private _cadsCache: ObjectOf<Index2Component["leftMenuCads"]> = {};

  constructor(
    private message: MessageService,
    private spinner: SpinnerService,
    private dataService: CadDataService,
    private status: AppStatusService
  ) {
    setGlobal("index2", this);
    this.status.cad.setConfig({
      backgroundColor: "black",
      padding: [10],
      selectMode: "multiple",
      minLinewidth: 2,
      hideLineLength: true,
      hideLineGongshi: true
    });
    this.stepType$.subscribe(this._onStepTypeChange.bind(this));
  }

  ngAfterViewInit() {
    this.updateCadViewer();
  }

  async updateCadViewer() {
    if (!this.contentEl) {
      return;
    }
    const el = this.contentEl.nativeElement;
    const cad = this.status.cad;
    cad.appendTo(el);
    const rect = el.getBoundingClientRect();
    cad.resize(rect.width, rect.height);
    const data = new CadData();
    data.merge(this.cadData1);
    data.merge(this.cadData2);
    data.merge(this.cadData3);
    await cad.reset(data).render();
    cad.center();
  }

  async updateLeftMenu() {
    this.leftMenuInputInfos = [];
    this.leftMenuCads = [];
    const stepType = this.stepType$.value;
    if (stepType === "直线") {
      this.leftMenuInputInfos = [
        {
          type: "number",
          name: "angle",
          label: "角度",
          model: {data: this.leftMenuInputData, key: "angle"},
          validators: [Validators.required],
          options: [
            {label: "→", value: 0},
            {label: "↑", value: 90},
            {label: "←", value: 180},
            {label: "↓", value: 270}
          ],
          noFilterOptions: true
        },
        {
          label: "长度",
          name: "length",
          type: "number",
          model: {data: this.leftMenuInputData, key: "length"},
          validators: [
            Validators.required,
            (control: AbstractControl) => {
              const num = control.value;
              if (!(num > 0)) {
                return {length: "长度必须大于0"};
              }
              return null;
            }
          ]
        }
      ];
    } else if (stepType) {
      let collection: CadCollection;
      let search: ObjectOf<any>;
      if (stepType === "开孔库") {
        collection = "cad";
        search = {分类: "孔"};
      } else {
        collection = "cad";
        search = {分类: "孔"};
      }
      if (this._cadsCache[stepType]) {
        this.leftMenuCads = this._cadsCache[stepType];
      } else {
        this.spinner.show(this.spinner.defaultLoaderId);
        const cads = (await this.dataService.getCad({collection, search})).cads;
        for (const data of cads) {
          const img = await getCadPreview("cad", data);
          this.leftMenuCads.push({data, img, selected: false});
        }
        this.spinner.hide(this.spinner.defaultLoaderId);
        this._cadsCache[stepType] = this.leftMenuCads;
      }
    }
  }

  openBottomInput() {
    this.bottomInput.disabled = false;
    setTimeout(() => {
      this.bottomInputEl?.nativeElement.focus();
    }, 0);
  }

  closeBottomInput() {
    this.bottomInput.disabled = true;
    this.bottomInput.value = "";
  }

  async setStepType(stepType: Index2StepType, toggle = true) {
    if (toggle && this.stepType$.value === stepType) {
      this.stepType$.next(null);
    } else {
      this.stepType$.next(stepType);
    }
    this.updateLeftMenu();
  }

  private _onStepTypeChange(stepType: Index2StepType | null) {
    // const subs: Subscription[] = [];
    if (stepType === "直线") {
      const entities = this.cadData1.entities;
      if (entities.length > 0) {
        this.status.setCadPoints(this.cadData1.entities);
      } else {
        this.openBottomInput();
        const values: string[] = [];
        this.bottomInput.output.pipe(take(3)).subscribe(async (value) => {
          values.push(value);
          if (values.length === 3) {
            const length = Number(values[1]);
            const angle = Number(values[2]);
            const dx = length * Math.cos((angle * Math.PI) / 180);
            const dy = length * Math.sin((angle * Math.PI) / 180);
            const e = new CadLine();
            e.end.copy(e.start.clone().add(dx, dy));
            entities.add(e);
            await this.updateCadViewer();
            this.setStepType(stepType, false);
            this.closeBottomInput();
            console.log("values", values);
          }
        });
      }
    } else {
      this.closeBottomInput();
      this.status.setCadPoints();
    }
  }

  getStep() {
    if (!this.stepInputs) {
      return null;
    }
    const type = this.stepType$.value;
    if (type === "直线") {
      const values = getInputValues(this.stepInputs.toArray(), this.message);
      if (!values) {
        return null;
      }
      return {type, ...values} as Index2Step;
    } else if (type) {
      const selected = this.leftMenuCads.find((v) => v.selected);
      if (!selected) {
        this.message.error("请选择一个cad");
        return null;
      }
      return {type, data: selected.data} as Index2Step;
    }
    return null;
  }

  selectLeftMenuCad(cad: Index2Component["leftMenuCads"][0]) {
    this.leftMenuCads.forEach((v) => (v.selected = false));
    cad.selected = true;
  }

  async generateFront() {
    const entities = this.status.cad.selected().clone();
    if (entities.length < 1) {
      this.message.error("没有选中");
      return;
    }
    const data = new CadData();
    data.entities.merge(entities);
    const lineGroups = sortLines(data);
    if (lineGroups.length !== 1) {
      this.message.error("选中的线必须可以一笔画成");
      return;
    }
    const height = 5;
    const entities2 = entities.clone(true);
    entities2.transform({translate: [0, height]}, true);
    data.entities.merge(entities2);
    const pointsTop: Point[] = [];
    const pointsBottom: Point[] = [];
    const addPoint = (pts: Point[], position: "top" | "bottom", p: Point) => {
      const p2 = pts.find((v) => isNearZero(v.x - p.x));
      if (p2) {
        if (position === "top") {
          p2.y = Math.min(p2.y, p.y);
        } else {
          p2.y = Math.max(p2.y, p.y);
        }
      } else {
        pts.push(p.clone());
      }
    };
    const addLinesArr = (lines: CadLineLike[], position: "top" | "bottom") => {
      for (const e of lines) {
        let e2: CadLine | undefined;
        if (e instanceof CadLine) {
          e2 = e;
        } else if (e instanceof CadArc) {
          e2 = new CadLine({start: e.curve.startPoint, end: e.curve.endPoint});
          e2._boundingRectCalc.transform({translate: [0, height]});
        }
        if (e2?.isHorizontal()) {
          if (position === "top") {
            addPoint(pointsTop, position, e.start);
            addPoint(pointsTop, position, e.end);
          } else {
            addPoint(pointsBottom, position, e.start);
            addPoint(pointsBottom, position, e.end);
          }
        }
      }
    };
    addLinesArr(lineGroups[0], "bottom");
    addLinesArr(sortLines(new CadData({entities: entities2}))[0], "top");
    for (let i = 0; i < pointsTop.length; i++) {
      const e = new CadLine({start: pointsBottom[i], end: pointsTop[i]});
      data.entities.add(e);
    }
    const img = await getCadPreview("cad", data);
    this.message.alert(`<img class="cad-preview" src="${img}">`);
  }

  onBottomValueChange(event: KeyboardEvent) {
    if (["Space", "Enter"].includes(event.code)) {
      this.bottomInput.output.next(this.bottomInput.value);
      this.bottomInput.value = "";
    }
  }
}

export const index2StepTypes = ["配件库", "开孔库", "模具库", "直线"] as const;

export type Index2StepType = typeof index2StepTypes[number];

export interface Index2StepBase {
  type: Index2StepType;
}
export interface Index2Step1 extends Index2StepBase {
  type: "配件库";
  data: CadData;
}
export interface Index2Step2 extends Index2StepBase {
  type: "开孔库";
  data: CadData;
}
export interface Index2Step3 extends Index2StepBase {
  type: "模具库";
  data: CadData;
}
export interface Index2Step4 extends Index2StepBase {
  type: "直线";
  angle: number;
  length: number;
}
export type Index2Step = Index2Step1 | Index2Step2 | Index2Step3 | Index2Step4;
