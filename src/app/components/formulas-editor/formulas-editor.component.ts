import {CdkDragDrop, moveItemInArray} from "@angular/cdk/drag-drop";
import {Component, ElementRef, Input, ViewChild} from "@angular/core";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";
import {setGlobal} from "@src/app/app.common";
import {CalcResult, Formulas} from "@src/app/utils/calc";
import {timeout} from "@utils";

@Component({
  selector: "app-formulas-editor",
  templateUrl: "./formulas-editor.component.html",
  styleUrls: ["./formulas-editor.component.scss"]
})
export class FormulasEditorComponent {
  private _formulas?: Formulas;
  @Input()
  get formulas() {
    return this._formulas;
  }
  set formulas(value) {
    this._formulas = value;
    this.updateFormulas(value);
  }
  @Input() vars?: Formulas;
  formulaList: string[][] = [];
  formulaListInputInfos: InputInfo[][] = [];
  formulasText = "";
  formulasInputInfo: InputInfo = {
    type: "string",
    label: "",
    textarea: {autosize: {minRows: 5}},
    model: {key: "formulasText", data: this}
  };
  testResult: CalcResult | null = null;
  @ViewChild("testResultEl", {read: ElementRef}) testResultEl?: ElementRef<HTMLDivElement>;

  constructor(private message: MessageService, private calc: CalcService) {
    setGlobal("formulasEditor", this);
  }

  updateFormulas(formulas?: Formulas) {
    if (formulas) {
      this.formulaList = Object.entries(formulas).map(([k, v]) => [k, String(v)]);
    }
    this.formulaListInputInfos = this.formulaList.map((arr) => [
      {type: "string", label: "", model: {key: "0", data: arr}},
      {type: "string", label: "", model: {key: "1", data: arr}}
    ]);
  }

  parseTextarea() {
    return this.formulasText
      .split(/;|\n/)
      .filter((v) => v)
      .map((v) => {
        const index1 = v.indexOf("=");
        const index2 = v.indexOf(":");
        let index = -1;
        if (index1 > -1 && index2 > -1) {
          index = Math.min(index1, index2);
        } else if (index1 === -1) {
          index = index2;
        } else {
          index = index1;
        }
        if (index > -1) {
          return [v.slice(0, index).replace(/ /g, ""), v.slice(index + 1).replace(/ /g, "")];
        }
        return false;
      })
      .filter((v) => v) as string[][];
  }

  addFormulas() {
    this.parseTextarea().some((arr) => {
      if (this.validateVarName(arr[0])) {
        this.formulaList.push([arr[0], arr[1]]);
        this.updateFormulas();
        return false;
      } else {
        this.message.error(`公式 ${arr[0]} = ${arr[1]} 重复`);
        return true;
      }
    });
  }

  validateVarName(varName: string, i?: number) {
    const prevs = this.formulaList.slice(0, i).map((v) => v[0]);
    const regExp = /^[0-9]/;
    return isNaN(Number(varName)) && !prevs.includes(varName) && !varName.match(regExp);
  }

  getFormulas(formulaList = this.formulaList) {
    const result: Formulas = {};
    for (const [k, v] of formulaList) {
      const n = Number(v);
      result[k] = isNaN(n) ? v : n;
    }
    return result;
  }

  addFormula(i: number) {
    this.formulaList.splice(i, 0, ["", ""]);
    this.updateFormulas();
  }

  removeFormula(i: number) {
    this.formulaList.splice(i, 1);
    this.updateFormulas();
  }

  dropFormula(event: CdkDragDrop<string[][]>) {
    moveItemInArray(this.formulaList, event.previousIndex, event.currentIndex);
    this.updateFormulas();
  }

  async test(formulas: Formulas) {
    const result = this.calc.calcFormulas(formulas, this.vars);
    if (result) {
      this.testResult = result;
      await timeout(200);
      this.message.alert({title: "计算结果", content: this.testResultEl?.nativeElement.innerHTML});
      this.testResult = null;
    }
  }

  returnZero() {
    return 0;
  }
}
