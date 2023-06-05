import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {ValidationErrors} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {setGlobal, XiaodaohangStructure} from "@app/app.common";
import {getCadPreview} from "@app/cad/utils";
import {CadData} from "@cad-viewer";
import {openBancaiFormDialog} from "@components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {timeout, WindowMessageManager} from "@utils";
import {Properties} from "csstype";
import {isEmpty, union} from "lodash";
import {
  emptyMrbcjfzInfoValues,
  filterCad,
  filterHuajian,
  getMrbcjfzInfo,
  isMrbcjfzInfoEmpty1,
  isMrbcjfzInfoEmpty2,
  ListItemKey,
  listItemKeys,
  MrbcjfzCadInfo,
  MrbcjfzHuajianInfo,
  MrbcjfzInfo,
  MrbcjfzListItem,
  MrbcjfzQiliaoInfo,
  MrbcjfzResponseData,
  MrbcjfzXinghao,
  MrbcjfzXinghaoInfo
} from "./mrbcjfz.types";

@Component({
  selector: "app-mrbcjfz",
  templateUrl: "./mrbcjfz.component.html",
  styleUrls: ["./mrbcjfz.component.scss"]
})
export class MrbcjfzComponent implements OnInit {
  @Input() id = 0;
  @Input() table = "";
  @Input() closeable = false;
  @Output() dataSubmit = new EventEmitter<MrbcjfzXinghaoInfo>();
  @Output() dataClose = new EventEmitter<void>();
  xinghao: MrbcjfzXinghaoInfo = new MrbcjfzXinghaoInfo({vid: 0, mingzi: ""});
  cads: MrbcjfzCadInfo[] = [];
  huajians: MrbcjfzHuajianInfo[] = [];
  qiliaos: MrbcjfzQiliaoInfo[] = [];
  bancaiKeys: string[] = [];
  bancaiKeysNonClear: string[] = [];
  bancaiKeysRequired: string[] = [];
  bancaiList: BancaiList[] = [];
  bancaiInputs: InputInfo<MrbcjfzInfo>[][] = [];
  activeBancaiKey: string | null = null;
  xiaodaohangStructure: XiaodaohangStructure | null = null;
  isFromOrder = false;
  wmm = new WindowMessageManager("默认板材及分组", this, window.parent);
  get activeBancai() {
    if (!this.activeBancaiKey) {
      return null;
    }
    return this.xinghao.默认板材[this.activeBancaiKey];
  }

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private dialog: MatDialog,
    private spinner: SpinnerService,
    private status: AppStatusService,
    private message: MessageService
  ) {
    setGlobal("mrbcjfz", this);
  }

  async ngOnInit() {
    let {id, table} = this;
    const params = this.route.snapshot.queryParams;
    const token = params.token;
    if (!id || !table) {
      id = params.id ? Number(params.id) : 0;
      table = params.table || "";
      this.id = id;
      this.table = table;
      if (this.id && this.table) {
        this.isFromOrder = false;
      } else {
        this.isFromOrder = true;
      }
    } else {
      await timeout(0);
    }
    if (token) {
      this.dataService.token = token;
    }
    if (this.isFromOrder) {
      const data = await this.getData();
      const xinghaosRaw = await this.dataService.queryMySql({table: "p_xinghao", filter: {where: {mingzi: data.xinghao}}});
      if (xinghaosRaw[0]) {
        this.xinghao = new MrbcjfzXinghaoInfo(xinghaosRaw[0]);
      } else {
        this.xinghao = new MrbcjfzXinghaoInfo({vid: 0, mingzi: data.xinghao});
      }
      for (const key in data.morenbancai) {
        if (key in this.xinghao.默认板材) {
          for (const key2 in data.morenbancai[key]) {
            if (data.morenbancai[key][key2]) {
              (this.xinghao.默认板材 as any)[key][key2] = data.morenbancai[key][key2];
            }
          }
        }
      }
      this.bancaiKeys = Object.keys(this.xinghao.默认板材);
      this.xiaodaohangStructure = {mingzi: "型号"};
      const bancaiListData = await this.dataService.getBancaiList();
      if (bancaiListData) {
        this.bancaiList = bancaiListData.bancais;
        this.bancaiKeys = bancaiListData.bancaiKeys;
        this.bancaiKeysNonClear = bancaiListData.bancaiKeysNonClear;
        this.bancaiKeysRequired = bancaiListData.bancaiKeysRequired;
      }
    } else {
      const response = await this.dataService.post<MrbcjfzResponseData>(
        "peijian/xinghao/bancaifenzuIndex",
        {table, id},
        {testData: "bancaifenzuIndex"}
      );
      const data = this.dataService.getResponseData(response);
      if (data) {
        this.xinghao = new MrbcjfzXinghaoInfo(data.xinghao);
        this.bancaiKeys = data.bancaiKeys;
        this.bancaiKeysNonClear = union(data.bancaiKeysNonClear, data.bancaiKeysRequired);
        this.bancaiKeysRequired = data.bancaiKeysRequired;
        this.xiaodaohangStructure = data.xiaodaohangStructure;
        this.cads = [];
        const cadsToRemove: MrbcjfzCadInfo[] = [];
        data.cads.forEach((v) => {
          const cadData = new CadData(v);
          const item: MrbcjfzCadInfo = {data: cadData, img: "", id: cadData.id};
          (async () => {
            item.img = await getCadPreview("cad", item.data, {http: this.dataService});
          })();
          if (filterCad(item)) {
            this.cads.push(item);
          } else {
            cadsToRemove.push(item);
          }
        });
        this.huajians = [];
        const huajiansToRemove: MrbcjfzHuajianInfo[] = [];
        data.huajians.map((v) => {
          const item: MrbcjfzHuajianInfo = {data: v, id: String(v.vid)};
          if (filterHuajian(item)) {
            this.huajians.push(item);
          } else {
            huajiansToRemove.push(item);
          }
        });
        this.qiliaos = [];
        data.qiliaos.forEach((v) => {
          const item: MrbcjfzQiliaoInfo = {data: v, id: String(v.mingzi)};
          this.qiliaos.push(item);
        });
        const cadsToRemove2: MrbcjfzCadInfo[] = [];
        const huajiansToRemove2: MrbcjfzHuajianInfo[] = [];
        for (const bancaiKey in this.xinghao.默认板材) {
          const info = this.xinghao.默认板材[bancaiKey];
          info.CAD.forEach((cadId) => {
            const item = cadsToRemove.find((v) => v.id === cadId);
            if (item && !cadsToRemove2.find((v) => v.id === cadId)) {
              cadsToRemove2.push(item);
            }
          });
          info.CAD = info.CAD.filter((v) => !cadsToRemove2.find((v2) => v2.id === v));
          info.花件.forEach((huajianId) => {
            const item = huajiansToRemove.find((v) => v.id === huajianId);
            if (item && !huajiansToRemove2.find((v) => v.id === huajianId)) {
              huajiansToRemove2.push(item);
            }
          });
          info.花件 = info.花件.filter((v) => !huajiansToRemove2.find((v2) => v2.id === v));
          this.justifyBancai(bancaiKey, info);
        }
        const errorMsgs: string[] = [];
        if (cadsToRemove2.length > 0) {
          errorMsgs.push(`删除了以下${cadsToRemove2.length}个无效cad: <br>${cadsToRemove2.map((v) => v.data.name).join("，")}`);
        }
        if (huajiansToRemove2.length > 0) {
          errorMsgs.push(`删除了以下${huajiansToRemove2.length}个无效花件: <br>${huajiansToRemove2.map((v) => v.data.mingzi).join("，")}`);
        }
        this.bancaiList = data.bancaiList;
        this.updateXinghao();
        this.updateListItems();

        if (errorMsgs.length > 0) {
          errorMsgs.push("<br><b>需要提交保存后才生效</b>");
          const result = await this.message.button({
            content: errorMsgs.join("<br>"),
            buttons: ["立刻提交"],
            btnTexts: {cancel: "稍后提交"}
          });
          if (result === "立刻提交") {
            this.submit();
          }
        }
      }
    }
  }

  updateXinghao() {
    const 默认板材 = this.xinghao.默认板材;
    this.xinghao.默认板材 = {};
    this.bancaiInputs = [];
    for (const key of this.bancaiKeys) {
      const data = getMrbcjfzInfo(默认板材[key]);
      this.xinghao.默认板材[key] = data;
    }
    this.xinghao.update();
  }

  async editBancaiForm(key: string) {
    const info = this.xinghao.默认板材[key];
    const result = await openBancaiFormDialog(this.dialog, {
      data: {
        data: {
          bancai: info.默认开料板材,
          cailiao: info.默认开料材料,
          houdu: info.默认开料板材厚度,
          kexuanbancai: info.可选板材
        },
        bancaiList: this.bancaiList
      }
    });
    if (result) {
      info.默认开料板材 = result.bancai;
      info.默认开料材料 = result.cailiao;
      info.默认开料板材厚度 = result.houdu;
      info.可选板材 = result.kexuanbancai || [];
    }
  }

  async emptyBancaiForm(key: string) {
    if (!(await this.message.confirm("是否确定清空？"))) {
      return;
    }
    const info = this.xinghao.默认板材[key];
    emptyMrbcjfzInfoValues(key, info, [
      "默认开料材料",
      "默认开料板材",
      "默认开料板材厚度",
      "CAD",
      "企料",
      "花件",
      "可选板材",
      "板材分组别名",
      "允许修改",
      "独立变化",
      "不显示"
    ]);
    if (this.activeBancaiKey) {
      this.selectBancaiKey(this.activeBancaiKey);
    }
    this.updateListItems();
  }

  justifyBancai(key: string, info: MrbcjfzInfo) {
    if (isMrbcjfzInfoEmpty1(key, info) && !this.bancaiKeysNonClear.includes(key)) {
      emptyMrbcjfzInfoValues(key, info, ["默认开料材料", "默认开料板材", "默认开料板材厚度"]);
    }
    if (isMrbcjfzInfoEmpty2(key, info)) {
      emptyMrbcjfzInfoValues(key, info, ["板材分组别名", "允许修改", "独立变化", "不显示"]);
    }
  }

  validateBancai(key: string, info: MrbcjfzInfo) {
    const errors: ValidationErrors = {};
    if (!isMrbcjfzInfoEmpty1(key, info) || this.bancaiKeysRequired.includes(key)) {
      if (isMrbcjfzInfoEmpty2(key, info)) {
        errors.required = true;
      }
    }
    return errors;
  }

  getBancaiStyle(key: string) {
    const info = this.xinghao.默认板材[key];
    const style: Properties = {};
    if (!isEmpty(this.validateBancai(key, info))) {
      style.color = "red";
    }
    return style;
  }

  selectBancaiKey(key: string) {
    if (this.activeBancaiKey !== key) {
      this.activeBancaiKey = key;
      this.updateListItems();
    }
  }

  getList(key: ListItemKey) {
    const list = this[listItemKeysMap[key]] as MrbcjfzListItem[] | undefined;
    if (!list) {
      return [];
    }
    return list;
  }

  updateListItems(key?: ListItemKey) {
    if (!key) {
      for (const key2 of listItemKeys) {
        this.updateListItems(key2);
      }
      return;
    }
    const ids = new Set<string>();
    for (const bancai of Object.values(this.xinghao.默认板材)) {
      for (const id of bancai[key]) {
        ids.add(id);
      }
    }
    const list = this.getList(key);
    list.forEach((item) => {
      item.selected = ids.has(item.id);
    });
  }

  selectListItem(item: MrbcjfzListItem, key: ListItemKey, bancaiKey?: string) {
    if (bancaiKey) {
      this.selectBancaiKey(bancaiKey);
    }
    const bancai = this.activeBancai;
    if (!bancai) {
      return;
    }
    if (bancai[key].includes(item.id)) {
      bancai[key] = bancai[key].filter((v) => v !== item.id);
    } else {
      bancai[key].push(item.id);
    }
    this.updateListItems(key);
  }

  async submit() {
    const {xinghao, table, isFromOrder} = this;
    if (!xinghao) {
      return;
    }
    const errorMsg: string[] = [];
    const errorBancaiKeys: string[] = [];
    for (const bancaiKey in xinghao.默认板材) {
      const info = xinghao.默认板材[bancaiKey];
      this.justifyBancai(bancaiKey, info);
      const errors = this.validateBancai(bancaiKey, info);
      if (!isEmpty(errors)) {
        errorBancaiKeys.push(bancaiKey);
      }
    }
    if (errorBancaiKeys.length) {
      errorMsg.push(`板材信息不完整：${errorBancaiKeys.join("，")}`);
    }
    if (!isFromOrder) {
      if (this.cads.some((v) => !v.selected)) {
        errorMsg.push("有CAD未选择");
      }
      if (this.huajians.some((v) => !v.selected)) {
        errorMsg.push("有花件未选择");
      }
    }
    if (errorMsg.length) {
      this.message.error(errorMsg.join("<br>"));
      return;
    }
    const data: TableUpdateParams<MrbcjfzXinghao>["data"] = {vid: xinghao.raw.vid};
    data.morenbancai = JSON.stringify(xinghao.默认板材);
    this.spinner.show(this.spinner.defaultLoaderId);
    let result = false;
    if (isFromOrder) {
      const response = await this.dataService.post("peijian/api/updateMorenbancaijifenzu", {
        name: xinghao.raw.mingzi,
        morenbancai: xinghao.默认板材
      });
      result = response?.code === 0;
    } else {
      result = await this.dataService.tableUpdate({table, data});
    }
    this.spinner.hide(this.spinner.defaultLoaderId);
    this.dataSubmit.emit(this.xinghao);
    return result;
  }

  close() {
    this.dataClose.emit();
  }

  openCad(item: MrbcjfzListItem) {
    this.status.openCadInNewTab(item.id, "cad");
  }

  async getData() {
    this.wmm.postMessage("getDataStart");
    return await this.wmm.waitForMessage("getDataEnd");
  }

  postDataStart() {
    return {action: "postDataEnd"};
  }

  async submitStart() {
    const fulfilled = await this.submit();
    return {action: "submitEnd", data: {fulfilled}};
  }
}

export const listItemKeysMap = {
  CAD: "cads",
  企料: "qiliaos",
  花件: "huajians"
} as const;
