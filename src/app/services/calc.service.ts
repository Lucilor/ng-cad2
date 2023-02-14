import {Injectable} from "@angular/core";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf} from "@utils";
import {isEmpty} from "lodash";
import {setGlobal} from "../app.common";
import {Calc, CalcCircularReferenceError, CalcSelfReferenceError, Formulas} from "../utils/calc";

@Injectable({
  providedIn: "root"
})
export class CalcService {
  calc = Calc;

  constructor(private message: MessageService) {
    setGlobal("calc", this, true);
  }

  async calcFormulas(formulas: Formulas, vars: Formulas = {}, errorMsg?: CalcCustomErrorMsg) {
    try {
      const result = Calc.calcFormulas(formulas, vars);
      const {errorTrim} = result;
      if (errorMsg && !isEmpty(errorTrim)) {
        const errorStr = this.getErrorFormusStr(errorTrim, vars, errorMsg);
        await this.message.error(errorStr);
        // console.warn({formulas, vars, result, errorMsg});
        return null;
      }
      return result;
    } catch (error) {
      if (error instanceof CalcSelfReferenceError) {
        let str = error.message + "<br><br>";
        str += `${error.varName}<span style='color:red'> => </span>${error.varValue}`;
        await this.message.error(str);
      } else if (error instanceof CalcCircularReferenceError) {
        let str = error.message + "<br><br>";
        str += `${error.varName1}<span style='color:red'> => </span>${error.varValue1}<br>`;
        str += `${error.varName2}<span style='color:red'> => </span>${error.varValue2}`;
        await this.message.error(str);
      } else {
        await this.message.alert({content: error});
        console.error(error);
      }
      return null;
    }
  }

  async calcExpression(expression: string, vars: Formulas & {input?: Formulas} = {}, errorMsg?: CalcCustomErrorMsg) {
    const formulas: Formulas = {result: expression};
    const result = await this.calcFormulas(formulas, vars, errorMsg);
    if (!result) {
      return null;
    }
    if (!("result" in result.succeedTrim)) {
      return null;
    }
    return result.succeedTrim.result;
  }

  private getErrorFormusStr(errorFormulas: Formulas, vars: Formulas, errorMsg?: CalcCustomErrorMsg) {
    const {code, title, prefix, suffix} = errorMsg || {};
    let str = `${prefix || ""}<h3>${title || ""}错误！请检查：${code || ""}<br/>1、<span style="color:red">公式匹配</span>是否正确；`;
    str += `2、<span style="color:red">公式书写</span>是否正确！</h3><br/><br/>`;
    str += suffix || "";

    if (vars && vars["正在计算CAD名字"]) {
      str += `CAD：${vars["正在计算CAD名字"]}<br/><br/>`;
    }

    const error1: ObjectOf<string> = {};

    for (const key in errorFormulas) {
      if (Object.prototype.hasOwnProperty.call(errorFormulas, key)) {
        const value = errorFormulas[key];
        error1[key] = Calc.replaceVars(value.toString(), vars);
      }
    }

    for (const k in errorFormulas) {
      if (Object.prototype.hasOwnProperty.call(errorFormulas, k)) {
        const v = errorFormulas[k];
        const calcV = Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : "";

        // 算料公式报错
        str += `公式: <span style="color:red"> ${k} = ${v}</span>, 计算结果: <span style="color:red">${error1[k]}</span>`;
        if (calcV) {
          str += ` = ${calcV}<br/>`;
        } else {
          str += "<br/>";
        }
      }
    }

    if (!str) {
      return "";
    }

    str += "<br/><br/>";
    return str;
  }
}

export interface CalcCustomErrorMsg {
  code?: string;
  title?: string;
  prefix?: string;
  suffix?: string;
  // data?: any;
}
