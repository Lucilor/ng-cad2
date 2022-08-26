import {Injectable} from "@angular/core";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf} from "@utils";
import {isEmpty} from "lodash";
import {setDevComponent} from "../app.common";
import {Calc, CalcCircularReferenceError, CalcSelfReferenceError, Formulas} from "../utils/calc";

@Injectable({
    providedIn: "root"
})
export class CalcService {
    calc = Calc;

    constructor(private message: MessageService) {
        setDevComponent("calc", this);
    }

    calcFormulas(formulas: Formulas, vars: Formulas & {input?: Formulas} = {}, showVars = true, alertError = true) {
        try {
            const result = Calc.calcFormulas(formulas, vars, showVars);
            const {errorTrim} = result;
            if (alertError && !isEmpty(errorTrim)) {
                const errorStr = this.getErrorFormusStr(errorTrim, vars);
                this.message.error(errorStr);
                return null;
            }
            return result;
        } catch (error) {
            if (error instanceof CalcSelfReferenceError) {
                let str = error.message + "<br><br>";
                str += `${error.varName}<span style='color:red'> => </span>${error.varValue}`;
                console.log(str);
                this.message.error(str);
            } else if (error instanceof CalcCircularReferenceError) {
                let str = error.message + "<br><br>";
                str += `${error.varName1}<span style='color:red'> => </span>${error.varValue1}<br>`;
                str += `${error.varName2}<span style='color:red'> => </span>${error.varValue2}`;
                this.message.error(str);
            } else {
                this.message.alert({content: error});
                console.error(error);
            }
            return null;
        }
    }

    private getErrorFormusStr(errorFormulas: Formulas, vars: Formulas, code = "", errorMsg = "") {
        let str = `<h3>错误！请检查：${code}<br/>1、<span style="color:red">公式匹配</span>是否正确；`;
        str += `2、<span style="color:red">公式书写</span>是否正确！</h3><br/><br/>`;
        str += errorMsg;

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
