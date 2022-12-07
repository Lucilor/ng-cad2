import {AfterViewInit, Component, ElementRef, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {AbstractControl, Validators} from "@angular/forms";
import {CadData, CadLine, CadViewer} from "@cad-viewer";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/types";
import {getInputValues} from "@modules/input/components/utils";
import {MessageService} from "@modules/message/services/message.service";
import {setGlobal} from "@src/app/app.common";
import {Point, timeout} from "@utils";

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
  @ViewChildren("stepInputs") stepInputs?: QueryList<InputComponent>;

  constructor(private message: MessageService) {
    setGlobal("index2", this);
    this.cad.setConfig({backgroundColor: "black", padding: [10]});
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

  updateLeftMenu() {
    const {stepType, stepIndex} = this;
    const step = this.steps[stepIndex];
    if (stepType === "直线") {
      const step2 = step.type === "直线" ? step : null;
      this.leftMenuInputInfos = [
        {
          type: "number",
          name: "angle",
          label: "角度",
          value: step2?.angle ?? 0,
          validators: [Validators.required]
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
    } else {
      this.leftMenuInputInfos = [];
    }
  }

  setStepType(type: Index2StepType) {
    this.stepType = this.stepType === type ? null : type;
    this.updateLeftMenu();
  }

  async addStep() {
    if (!this.stepInputs) {
      return;
    }
    const type = this.stepType;
    if (!type) {
      return;
    }
    const values = getInputValues(this.stepInputs.toArray(), this.message);
    if (!values) {
      return;
    }
    const step = {type, ...values} as Index2Step;
    if (this.stepIndex >= 0) {
      this.steps.splice(this.stepIndex, 0, step);
    } else {
      this.steps.push(step);
    }
    await this.updateSteps();
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
      }
    }
    const cad = this.cad;
    await cad.reset(data).render();
    cad.center();
  }

  selectStep(i: number) {
    this.stepIndex = this.stepIndex === i ? -1 : i;
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
