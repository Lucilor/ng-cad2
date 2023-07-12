import {ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {getFilepathUrl, replaceRemoteHost, setGlobal} from "@app/app.common";
import {openSelectBancaiCadsDialog} from "@components/dialogs/select-bancai-cads/select-bancai-cads.component";
import {downloadByUrl, ObjectOf, timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiCad, BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputComponent} from "@modules/input/components/input.component";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {cloneDeep} from "lodash";
import {DateTime} from "luxon";
import {BancaiCadExtend, BancaisInfo, guigePattern, houduPattern, OrderBancaiInfo, SelectBancaiDlHistory} from "./select-bancai.types";

@Component({
  selector: "app-select-bancai",
  templateUrl: "./select-bancai.component.html",
  styleUrls: ["./select-bancai.component.scss"]
})
export class SelectBancaiComponent implements OnInit {
  autoGuige = true;
  sortedCads: BancaiCadExtend[][][] = [];
  orderBancaiInfos: OrderBancaiInfo[] = [];
  bancaiList: ObjectOf<BancaiList> = {};
  codes: string[] = [];
  table = "";
  type = "";
  gasOptions = [
    {value: "Air", label: "空气"},
    {value: "O2", label: "氧气"},
    {value: "N2", label: "氮气"},
    {value: "H-Air", label: "高压空气"},
    {value: "H-O2", label: "高压氧气"},
    {value: "H-N2", label: "高压氮气"}
  ] as const;
  loaderId = "selectBancai";
  submitLoaderId = "selectBancaiSubmit";
  downloadHistory: SelectBancaiDlHistory[] = [];
  downloadName = "";
  showGas = false;

  @ViewChildren("bancaiInfoInput") bancaiInfoInputs?: QueryList<InputComponent>;

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private message: MessageService,
    private dialog: MatDialog,
    private cd: ChangeDetectorRef,
    private spinner: SpinnerService,
    private status: AppStatusService
  ) {
    setGlobal("selectBancai", this);
  }

  async ngOnInit() {
    const {codes, table, type} = this.route.snapshot.queryParams;
    if (codes && table && type) {
      this.spinner.show(this.loaderId);
      this.codes = codes.split(",");
      this.table = table;
      document.title = type;
      this.type = type;
      await this.refreshDownloadHistory();
      const response = await this.dataService.post<BancaisInfo>("order/order/getBancais", {table, codes: this.codes});
      const result = this.dataService.getResponseData(response);
      this.spinner.hide(this.loaderId);
      if (result) {
        const bancaiZidingyi = result.bancaiList.find((v) => v.mingzi === "自定义");
        const errMsgs: string[] = [];
        this.orderBancaiInfos = [];
        for (const orderBancai of result.orderBancais) {
          const {code, bancaiCads, 上下走线, 开料孔位配置, 开料参数} = orderBancai;
          for (const cad of bancaiCads) {
            let list = result.bancaiList.find((v) => v.mingzi === cad.bancai.mingzi);
            if (!list && bancaiZidingyi) {
              list = cloneDeep(bancaiZidingyi);
              list.mingzi = cad.bancai.mingzi;
            }
            if (list) {
              this.bancaiList[list.mingzi] = list;
              if (!cad.bancai.cailiao) {
                cad.bancai.cailiao = list.cailiaoList[0];
              }
              if (!cad.bancai.houdu) {
                cad.bancai.houdu = list.houduList[0];
              }
              if (!cad.bancai.guige) {
                if (!list.guigeList[0]) {
                  this.message.alert(`${cad.bancai.mingzi}, 没有板材规格`);
                  throw new Error(`${cad.bancai.mingzi}, 没有板材规格`);
                }
                cad.bancai.guige = list.guigeList[0].slice();
              }
              if (!cad.bancai.gas) {
                cad.bancai.gas = "Air";
              }
            }
          }
          const orderBancaiInfo: OrderBancaiInfo = {
            code,
            shangxiazouxianUrl: 上下走线,
            kailiaokongweipeizhiUrl: 开料孔位配置,
            kailiaocanshuzhiUrl: 开料参数,
            sortedCads: [],
            bancaiInfos: []
          };
          this.orderBancaiInfos.push(orderBancaiInfo);
          this.updateSortedCads(orderBancaiInfo, bancaiCads);
          for (const error of orderBancai.errors) {
            errMsgs.push(`订单编号:${error.code}<br>${error.msg}`);
          }
        }
        this.updateOrderBancaiInfos();
        this.downloadName = result.downloadName;
        this.showGas = type === "激光喷码开料排版";
        if (this.status.getProjectConfig("激光开料展开信息") === "大族激光") {
          this.showGas = true;
        }
        if (errMsgs.length > 0) {
          this.message.alert({title: "开料报错", content: errMsgs.join("<br><br>")});
        }
      }
    } else {
      this.message.alert("缺少参数");
    }
  }

  async refreshDownloadHistory() {
    const response = await this.dataService.post<ObjectOf<any>[]>("order/order/getKailiaoDlHistory", {codes: this.codes});
    const dlHistory = this.dataService.getResponseData(response);
    if (dlHistory) {
      this.downloadHistory = dlHistory.map<SelectBancaiDlHistory>((v) => ({
        name: v.name,
        date: DateTime.fromMillis(Number(v.创建时间)).toFormat("yyyy-MM-dd HH:mm:ss")
      }));
    }
  }

  getBancaiCadExtend(bancaiCad: BancaiCad) {
    const result: BancaiCadExtend = {...bancaiCad, checked: false, oversized: false, disabled: false};
    const guige = bancaiCad.bancai.guige;
    if (Array.isArray(guige)) {
      result.oversized = bancaiCad.width > guige[0] || bancaiCad.height > guige[1];
    }
    return result;
  }

  isBancaiDuplicate(a: BancaiCad["bancai"], b: BancaiCad["bancai"]) {
    return (
      a.mingzi === b.mingzi &&
      a.cailiao === b.cailiao &&
      a.houdu === b.houdu &&
      a.guige?.[0] === b.guige?.[0] &&
      a.guige?.[1] === b.guige?.[1] &&
      a.gas === b.gas
    );
  }

  updateSortedCads(info: OrderBancaiInfo, bancaiCads: BancaiCad[] | BancaiCad["bancai"], i?: number) {
    if (Array.isArray(bancaiCads)) {
      const sortedCads: BancaiCadExtend[][] = [];
      for (const bancaiCad of bancaiCads) {
        const bancai = bancaiCad.bancai;
        if (sortedCads.length) {
          const index = sortedCads.findIndex((group) => {
            if (group.length) {
              const groupBancai = group[0].bancai;
              return this.isBancaiDuplicate(bancai, groupBancai);
            }
            return true;
          });
          if (index > -1) {
            sortedCads[index].push(this.getBancaiCadExtend(bancaiCad));
          } else {
            sortedCads.push([this.getBancaiCadExtend(bancaiCad)]);
          }
        } else {
          sortedCads.push([this.getBancaiCadExtend(bancaiCad)]);
        }
      }
      bancaiCads.forEach((bancaiCad) => {
        const bancai = bancaiCad.bancai;
        if (sortedCads.length) {
          const index = sortedCads.findIndex((group) => {
            if (group.length) {
              const groupBancai = group[0].bancai;
              return this.isBancaiDuplicate(bancai, groupBancai);
            }
            return true;
          });
          if (index > -1) {
            sortedCads[index].push(this.getBancaiCadExtend(bancaiCad));
          } else {
            sortedCads.push([this.getBancaiCadExtend(bancaiCad)]);
          }
        } else {
          sortedCads.push([this.getBancaiCadExtend(bancaiCad)]);
        }
      });
      info.sortedCads = sortedCads;
    } else if (typeof i === "number") {
      const sortedCads = info.sortedCads;
      const group = sortedCads[i];
      console.log(bancaiCads);
      group.forEach((v) => {
        Object.assign(v.bancai, bancaiCads);
        if (Array.isArray(v.bancai.guige)) {
          v.oversized = v.width > v.bancai.guige[0] || v.height > v.bancai.guige[1];
        } else {
          v.oversized = false;
        }
      });
      const duplicateIdx = sortedCads.findIndex((v, j) => j !== i && this.isBancaiDuplicate(v[0].bancai, group[0].bancai));
      if (duplicateIdx >= 0) {
        sortedCads[duplicateIdx] = sortedCads[duplicateIdx].concat(group);
        sortedCads.splice(i, 1);
        this.orderBancaiInfos.splice(i, 1);
        this.message.snack("板材信息相同, 已合并");
        this.updateOrderBancaiInfos();
      }
    }
  }

  updateOrderBancaiInfos() {
    for (const info of this.orderBancaiInfos) {
      info.bancaiInfos = [];
      for (const [i, group] of info.sortedCads.entries()) {
        const bancai = cloneDeep(group[0].bancai);
        const onChange = (key: keyof BancaiCad["bancai"], value: string) => {
          console.log(key, value);
          if (key === "guige") {
            const match = value.match(guigePattern);
            if (match) {
              bancai.guige = [Number(match[1]), Number(match[3])];
            }
          } else {
            bancai[key] = value;
          }
          this.updateSortedCads(info, bancai, i);
        };
        const bancaiList = this.bancaiList[bancai.mingzi];
        const cailiaos = bancaiList?.cailiaoList || [];
        const houdus = bancaiList?.houduList || [];
        const guiges = (bancaiList?.guigeList || []).map((v) => v.join(" × "));
        const gasOptions = this.gasOptions.slice();
        const bancaiInfo: (typeof info.bancaiInfos)[0] = {
          cads: group.map((v) => v.id),
          oversized: group.some((v) => v.oversized),
          inputInfos: [
            {label: "板材", type: "string", readonly: true, value: bancai.mingzi, validators: Validators.required},
            {
              label: "材料",
              type: "string",
              value: bancai.cailiao || "",
              options: cailiaos,
              fixedOptions: cailiaos,
              onChange: (value) => onChange("cailiao", value),
              validators: Validators.required
            },
            {
              label: "厚度",
              type: "string",
              value: bancai.houdu || "",
              options: houdus,
              fixedOptions: houdus,
              onChange: (value) => onChange("houdu", value),
              validators: [
                Validators.required,
                (control) => {
                  if (!houduPattern.test(control.value)) {
                    return {pattern: "厚度必须为数字"};
                  }
                  return null;
                }
              ]
            },
            {
              label: "规格",
              type: "string",
              value: bancai.guige?.join(" × ") || "",
              options: guiges,
              fixedOptions: guiges,
              onChange: (value) => onChange("guige", value),
              validators: [
                Validators.required,
                (control) => {
                  if (!guigePattern.test(control.value)) {
                    return {pattern: "规格必须为两个数字(如: 10,10)"};
                  }
                  return null;
                }
              ]
            }
          ]
        };
        if (this.showGas) {
          bancaiInfo.inputInfos.push({
            label: "切割保护气体",
            type: "select",
            value: bancai.gas || "",
            options: gasOptions,
            onChange: (value) => onChange("gas", value)
          });
        }
        info.bancaiInfos.push(bancaiInfo);
      }
    }
  }

  async openCadsDialog(i: number, j: number) {
    const info = this.orderBancaiInfos[i];
    const cads = info.sortedCads[j];
    const result = await openSelectBancaiCadsDialog(this.dialog, {data: {cads}});
    if (result && result.length) {
      const oldGroup: BancaiCadExtend[] = [];
      const newGroup: BancaiCadExtend[] = [];
      cads.forEach((cad) => {
        if (result.includes(cad.id)) {
          cad.bancai.guige = null;
          newGroup.push(cad);
        } else {
          oldGroup.push(cad);
        }
      });
      if (oldGroup.length) {
        info.sortedCads[j] = oldGroup;
      } else {
        info.sortedCads.splice(i, 1);
      }
      info.sortedCads.push(newGroup);
      this.updateOrderBancaiInfos();
    }
  }

  async submit() {
    await timeout(0);
    if (this.bancaiInfoInputs) {
      for (const bancaiInfoInput of this.bancaiInfoInputs) {
        if (!bancaiInfoInput.isValid()) {
          this.message.error("输入有误，请检查");
          return;
        }
      }
    }
    const skipCads: string[] = [];
    const bancaiCadsArr: BancaiCad[][] = [];
    for (const info of this.orderBancaiInfos) {
      const arr1: BancaiCad[] = [];
      for (const group of info.sortedCads) {
        for (const cad of group) {
          if (cad.disabled) {
            skipCads.push(cad.name);
          } else {
            const clone = {...cad} as Partial<BancaiCadExtend>;
            delete clone.checked;
            delete clone.oversized;
            delete clone.disabled;
            arr1.push(clone as BancaiCad);
          }
        }
      }
      bancaiCadsArr.push(arr1);
    }
    this.spinner.show(this.submitLoaderId);
    const api = "order/order/selectBancai";
    const {codes, table, autoGuige, type} = this;
    const response = await this.dataService.post<string | string[]>(api, {codes, bancaiCadsArr, table, autoGuige, type, skipCads});
    await this.refreshDownloadHistory();
    this.spinner.hide(this.submitLoaderId);
    const url = this.dataService.getResponseData(response);
    if (url) {
      if (Array.isArray(url)) {
        this.message.alert(url.map((v) => `<div>${v}</div>`).join(""));
      } else {
        this.downloadDxf(replaceRemoteHost(url));
      }
    }
  }

  open(url: string) {
    window.open(url);
  }

  downloadDxf(url: string, isName = false) {
    const downloadName = this.downloadName || this.codes.join(",");
    if (isName) {
      url = getFilepathUrl(`tmp/${url}.dxf`);
    }
    downloadByUrl(url, {filename: downloadName + ".dxf"});
  }

  returnZero() {
    return 0;
  }

  openDdbq() {
    const url = new URL(location.href);
    url.pathname = "/dingdanbiaoqian";
    url.searchParams.set("type", "标签贴纸");
    this.open(url.href);
  }
}
