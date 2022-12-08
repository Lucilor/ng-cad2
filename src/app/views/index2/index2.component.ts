import {AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {AbstractControl, Validators} from "@angular/forms";
import {SafeUrl} from "@angular/platform-browser";
import {CadData, CadLine, CadViewer, sortLines} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/types";
import {getInputValues} from "@modules/input/components/utils";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {CadCollection, setGlobal} from "@src/app/app.common";
import {getCadPreview} from "@src/app/cad.utils";
import {ObjectOf, Point, timeout} from "@utils";

@Component({
  selector: "app-index2",
  templateUrl: "./index2.component.html",
  styleUrls: ["./index2.component.scss"]
})
export class Index2Component implements AfterViewInit {
  cad = new CadViewer();
  @ViewChild("contentEl", {read: ElementRef}) contentEl?: ElementRef<HTMLDivElement>;
  stepType: Index2StepType | null = null;
  stepTypes = index2StepTypes;
  steps: Index2Step[] = [];
  stepIndex = -1;
  leftMenuInputInfos: InputInfo[] = [];
  leftMenuCads: {data: CadData; img: SafeUrl; selected: boolean}[] = [];
  inputValues: ObjectOf<any> = {};
  @ViewChildren("stepInputs") stepInputs?: QueryList<InputComponent>;

  private _cadsCache: ObjectOf<Index2Component["leftMenuCads"]> = {};

  constructor(private message: MessageService, private spinner: SpinnerService, private dataService: CadDataService) {
    setGlobal("index2", this);
    this.cad.setConfig({
      backgroundColor: "black",
      padding: [10],
      selectMode: "multiple",
      minLinewidth: 2,
      hideLineLength: true,
      hideLineGongshi: true
    });
  }

  ngAfterViewInit() {
    this.updateCadViewer();
  }

  updateCadViewer() {
    if (!this.contentEl) {
      return;
    }
    const el = this.contentEl.nativeElement;
    const cad = this.cad;
    cad.appendTo(el);
    const rect = el.getBoundingClientRect();
    cad.resize(rect.width, rect.height);
  }

  async updateLeftMenu() {
    const step = this.steps[this.stepIndex];
    this.leftMenuInputInfos = [];
    this.leftMenuCads = [];
    if (step) {
      this.stepType = step.type;
    }
    const {stepType} = this;
    if (stepType === "直线") {
      const step2 = step?.type === "直线" ? step : null;
      this.leftMenuInputInfos = [
        {
          type: "number",
          name: "angle",
          label: "角度",
          value: step2?.angle ?? 0,
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
          value: step2?.length ?? 1,
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
        this.spinner.hide(this.spinner.defaultLoaderId);
        this.leftMenuCads = cads.map((data) => ({data, img: "", selected: false}));
        await timeout(0);
        for (const v of this.leftMenuCads) {
          v.img = await getCadPreview(collection, v.data);
        }
        this._cadsCache[stepType] = this.leftMenuCads;
      }
    }
  }

  setStepType(type: Index2StepType) {
    this.stepType = this.stepType === type ? null : type;
    this.updateLeftMenu();
  }

  getStep() {
    if (!this.stepInputs) {
      return null;
    }
    const type = this.stepType;
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

  addStep(i?: number) {
    const step = this.getStep();
    if (!step) {
      return;
    }
    if (typeof i === "number") {
      this.steps.splice(this.stepIndex, 0, step);
    } else {
      this.steps.push(step);
    }
    this.updateSteps();
  }

  replaceStep(i: number) {
    const step = this.getStep();
    if (!step) {
      return;
    }
    this.steps[i] = step;
    this.updateSteps();
  }

  removeStep(i: number) {
    this.steps.splice(i, 1);
    this.updateSteps();
  }

  async updateSteps() {
    await timeout(0);
    this.updateCadViewer();
    const data = new CadData();
    let startPoint = new Point(0, 0);
    for (const step of this.steps) {
      if (step.type === "直线") {
        const e = new CadLine();
        data.entities.add(e);
        e.start.copy(startPoint);
        const angle = (step.angle * Math.PI) / 180;
        const dx = step.length * Math.cos(angle);
        const dy = step.length * Math.sin(angle);
        const endPoint = startPoint.clone().add(dx, dy);
        e.end.copy(endPoint);
        startPoint = endPoint;
      } else {
        const cadData = step.data.clone(true);
        const lineGroups = sortLines(cadData);
        if (lineGroups.length !== 1) {
          this.message.error(`cad${cadData.name}不是可以一笔画成的图形`);
          continue;
        }
        const lines = lineGroups[0];
        const translate = startPoint.clone().sub(lines[0].start);
        cadData.transform({translate}, true);
        data.entities.merge(cadData.entities);
        startPoint = lines[lines.length - 1].end;
      }
    }
    const cad = this.cad;
    await cad.reset(data).render();
    cad.center();
    this.updateLeftMenu();
  }

  selectStep(i: number) {
    this.stepIndex = this.stepIndex === i ? -1 : i;
    this.updateLeftMenu();
  }

  selectLeftMenuCad(cad: Index2Component["leftMenuCads"][0]) {
    this.leftMenuCads.forEach((v) => (v.selected = false));
    cad.selected = !cad.selected;
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
