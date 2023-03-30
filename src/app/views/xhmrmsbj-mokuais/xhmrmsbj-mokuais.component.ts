import {ElementRef} from "@angular/core";
import {ViewChildren} from "@angular/core";
import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {Formulas} from "@app/utils/calc";
import {CadData, toFixedTrim} from "@cad-viewer";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {getMokuaiTitle, ZixuanpeijianMokuaiItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {FormulaInfo} from "@components/formulas/formulas.component";
import {CalcService} from "@services/calc.service";
import {SuanliaoInput, SuanliaoOutput} from "@views/suanliao/suanliao.component";
import {uniqWith} from "lodash";

@Component({
  selector: "app-xhmrmsbj-mokuais",
  templateUrl: "./xhmrmsbj-mokuais.component.html",
  styleUrls: ["./xhmrmsbj-mokuais.component.scss"]
})
export class XhmrmsbjMokuaisComponent {
  @ViewChildren("mkdxFormula", {read: ElementRef}) mkdxFormulaRef?: ElementRef<HTMLDivElement>[];
  mkdxFormulaInfos: XhmrmsbjMkdxFormulaInfo[] = [];
  xuanzhongMokuaiInfos: XhmrmsbjXuanzhongMokuaiInfo[] = [];
  getMokuaiTitle = getMokuaiTitle;

  constructor(
    public dialogRef: MatDialogRef<XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisOutput>,
    @Inject(MAT_DIALOG_DATA) public data: XhmrmsbjMokuaisInput,
    private calc: CalcService
  ) {
    this.update();
  }

  async update() {
    this.mkdxFormulaInfos = [];
    this.xuanzhongMokuaiInfos = [];
    const {input, output} = this.data.data;
    for (const key of input.bujuNames) {
      const value = input.型号选中门扇布局[key];
      if (!value) {
        continue;
      }
      const mkdxFormulaInfos: XhmrmsbjMkdxFormulaInfo = {name: key, formulaInfos: []};
      mkdxFormulaInfos.formulaInfos = this.getFormulaInfos(value.模块大小输出 || {});
      this.mkdxFormulaInfos.push(mkdxFormulaInfos);
      const xuanzhongMokuaiInfo: XhmrmsbjXuanzhongMokuaiInfo = {name: key, nodes: []};
      for (const node of value.模块节点 || []) {
        const mokuai = node.选中模块;
        if (mokuai) {
          const mokuai2 = output.配件模块CAD.find((v) => {
            const {门扇名字, 模块名字} = v.info || {};
            return 门扇名字 === key && 模块名字 === node.层名字 && v.weiyima === mokuai.weiyima;
          });
          const formulas2 = {...output.materialResult, ...value.模块大小输出};
          const cads: CadData[] = [];
          if (mokuai2) {
            Object.assign(formulas2, mokuai2.suanliaogongshi);
            for (const cadItem of mokuai2.cads) {
              cads.push(new CadData(cadItem.data));
              Object.assign(formulas2, cadItem.info.dimensionVars);
            }
            formulas2.门扇布局 = mokuai2.info?.门扇布局?.name || "";
          }
          for (const key2 of ["总宽", "总高"]) {
            const key3 = node.层名字 + key2;
            if (key3 in formulas2) {
              formulas2[key2] = formulas2[key3];
            }
          }
          xuanzhongMokuaiInfo.nodes.push({
            layer: node.层名字,
            mokuai,
            formulaInfos: this.getFormulaInfos(mokuai.suanliaogongshi || {}, formulas2)
          });
        }
      }
      this.xuanzhongMokuaiInfos.push(xuanzhongMokuaiInfo);
    }
  }

  getFormulaInfos(formulas: Formulas, formulas2?: Formulas) {
    const infos: FormulaInfo[] = [];
    const getValue = (val: string | number): FormulaInfo["values"] => {
      if (typeof val === "number") {
        return [{eq: true, name: toFixedTrim(val, 2)}];
      } else {
        return [
          {eq: true, name: val},
          {eq: true, name: this.calc.calc.replaceVars(val, formulas2)}
        ];
      }
    };
    for (const [key, value] of Object.entries(formulas)) {
      const keys: FormulaInfo["keys"] = [{eq: true, name: key}];
      let values: FormulaInfo["values"] = [...getValue(value)];
      if (formulas2 && key in formulas2) {
        const value2 = getValue(formulas2[key]);
        const calcResult = this.calc.calc.calcExpress(`(${values.at(-1)?.name}) == (${value2.at(0)?.name})`);
        value2[0].eq = calcResult.value === true;
        values.push(...value2);
      }
      values = uniqWith(values, (a, b) => a.name === b.name);
      infos.push({keys, values});
    }
    return infos;
  }

  close() {
    this.dialogRef.close();
  }
}

export interface XhmrmsbjMokuaisInput {
  data: {input: SuanliaoInput; output: SuanliaoOutput};
}

export type XhmrmsbjMokuaisOutput = void;

export const openXhmrmsbjMokuaisDialog = getOpenDialogFunc<XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisInput, XhmrmsbjMokuaisOutput>(
  XhmrmsbjMokuaisComponent,
  {width: "100%", height: "100%"}
);

export interface XhmrmsbjMkdxFormulaInfo {
  name: string;
  formulaInfos: FormulaInfo[];
}

export interface XhmrmsbjXuanzhongMokuaiInfo {
  name: string;
  nodes: {
    layer: string;
    mokuai: ZixuanpeijianMokuaiItem;
    formulaInfos: FormulaInfo[];
  }[];
}
