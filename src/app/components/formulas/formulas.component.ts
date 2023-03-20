import {AfterViewInit, ElementRef} from "@angular/core";
import {QueryList} from "@angular/core";
import {ViewChildren} from "@angular/core";
import {Input} from "@angular/core";
import {Component} from "@angular/core";
import {timeout} from "@utils";
import {Properties} from "csstype";
import {lastValueFrom} from "rxjs";
import {Subject} from "rxjs";

@Component({
  selector: "app-formulas",
  templateUrl: "./formulas.component.html",
  styleUrls: ["./formulas.component.scss"]
})
export class FormulasComponent implements AfterViewInit {
  private _formulaInfos: FormulaInfo[] = [];
  @Input()
  get formulaInfos() {
    return this._formulaInfos;
  }
  set formulaInfos(value) {
    this._formulaInfos = value;
    this.update();
  }

  private _viewInited = new Subject<void>();
  formulasStyles: Properties & {"--formula-key-width"?: string} = {};
  @ViewChildren("formulaKey", {read: ElementRef}) formulaKeyRefs?: QueryList<ElementRef<HTMLDivElement>>;

  ngAfterViewInit() {
    this._viewInited.next();
    this._viewInited.complete();
  }

  async update() {
    if (!this.formulaKeyRefs) {
      await lastValueFrom(this._viewInited);
    }
    this.formulasStyles["--formula-key-width"] = "auto";
    await timeout(500);
    if (!this.formulaKeyRefs) {
      return;
    }
    let maxWidth = 0;
    this.formulaKeyRefs.forEach((ref) => {
      const {width} = ref.nativeElement.getBoundingClientRect();
      if (width > maxWidth) {
        maxWidth = width;
      }
    });
    this.formulasStyles["--formula-key-width"] = Math.ceil(maxWidth) + "px";
  }
}

export interface FormulaInfo {
  name: string;
  values?: string[];
  nameClass?: string;
}
