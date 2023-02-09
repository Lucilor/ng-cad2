import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {ValidationErrors} from "@angular/forms";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {CadData} from "@cad-viewer";
import {openBancaiFormDialog} from "@components/dialogs/bancai-form-dialog/bancai-form-dialog.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {AppStatusService} from "@services/app-status.service";
import {setGlobal} from "@src/app/app.common";
import {getCadPreview} from "@src/app/cad.utils";
import {timeout} from "@utils";
import {Properties} from "csstype";
import {isEmpty, union} from "lodash";
import {
  filterCad,
  filterHuajian,
  getMrbcjfzInfo,
  isMrbcjfzInfoEmpty,
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
    if (!id || !table) {
      const params = this.route.snapshot.queryParams;
      id = params.id ? Number(params.id) : 0;
      table = params.table || "";
      this.id = id;
      this.table = table;
    } else {
      await timeout(0);
    }
    const response = await this.dataService.post<MrbcjfzResponseData>(
      "peijian/xinghao/bancaifenzuIndex",
      {table, id},
      {testData: "bancaifenzuIndex"}
    );
    if (response?.data) {
      this.xinghao = new MrbcjfzXinghaoInfo(response.data.xinghao);
      this.bancaiKeys = response.data.bancaiKeys;
      this.bancaiKeysNonClear = union(response.data.bancaiKeysNonClear, response.data.bancaiKeysRequired);
      this.bancaiKeysRequired = response.data.bancaiKeysRequired;
      this.cads = [];
      const cadsToRemove: MrbcjfzCadInfo[] = [];
      response.data.cads.forEach((v) => {
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
      response.data.huajians.map((v) => {
        const item: MrbcjfzHuajianInfo = {data: v, id: String(v.vid)};
        if (filterHuajian(item)) {
          this.huajians.push(item);
        } else {
          huajiansToRemove.push(item);
        }
      });
      this.qiliaos = [];
      response.data.qiliaos.forEach((v) => {
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
      this.bancaiList = response.data.bancaiList;
      this.updateXinghao();
      this.updateListItems();

      if (errorMsgs.length > 0) {
        errorMsgs.push("<br><b>需要提交保存后才生效</b>");
        const result = await this.message.button({content: errorMsgs.join("<br>"), buttons: ["立刻提交"], btnTexts: {cancel: "稍后提交"}});
        if (result === "立刻提交") {
          this.submit();
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

  justifyBancai(key: string, info: MrbcjfzInfo) {
    if (isMrbcjfzInfoEmpty(info) && !this.bancaiKeysNonClear.includes(key)) {
      info.默认开料材料 = "";
      info.默认开料板材 = "";
      info.默认开料板材厚度 = "";
    }
  }

  validateBancai(key: string, info: MrbcjfzInfo) {
    const {默认开料板材, 默认开料材料, 默认开料板材厚度} = info;
    const errors: ValidationErrors = {};
    if (!isMrbcjfzInfoEmpty(info) || this.bancaiKeysRequired.includes(key)) {
      if (![默认开料板材, 默认开料材料, 默认开料板材厚度].every(Boolean)) {
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
    this.activeBancaiKey = key;
    this.updateListItems();
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
    const {xinghao, table} = this;
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
    if (this.cads.some((v) => !v.selected)) {
      errorMsg.push("有CAD未选择");
    }
    if (this.huajians.some((v) => !v.selected)) {
      errorMsg.push("有花件未选择");
    }
    // if (this.qiliaos.some((v) => !v.selected)) {
    //   errorMsg.push("有企料未选择");
    // }
    if (errorMsg.length) {
      this.message.error(errorMsg.join("<br>"));
      return;
    }
    const tableData: TableUpdateParams<MrbcjfzXinghao>["tableData"] = {vid: xinghao.raw.vid};
    tableData.morenbancai = JSON.stringify(xinghao.默认板材);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
    this.spinner.hide(this.spinner.defaultLoaderId);
    this.dataSubmit.emit(this.xinghao);
  }

  close() {
    this.dataClose.emit();
  }

  openCad(item: MrbcjfzListItem) {
    this.status.openCadInNewTab(item.id, "cad");
  }
}

export const listItemKeysMap = {
  CAD: "cads",
  企料: "qiliaos",
  花件: "huajians"
} as const;
