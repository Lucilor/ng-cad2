import {Component, Inject} from "@angular/core";
import {Validators} from "@angular/forms";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {session, setGlobal} from "@app/app.common";
import {queryString, timeout} from "@lucilor/utils";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {debounce} from "lodash";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-bancai-list",
  templateUrl: "./bancai-list.component.html",
  styleUrls: ["./bancai-list.component.scss"]
})
export class BancaiListComponent {
  filterText = "";
  filterInputInfo: InputInfo = {
    type: "string",
    label: "搜索",
    model: {key: "filterText", data: this},
    autoFocus: true,
    onInput: debounce(() => {
      this.filterList();
      this.saveFilterText();
    }, 500)
  };
  list: {bancai: BancaiList; hidden: boolean; checked: boolean}[] = [];
  zidingyi = "";
  zidingyiIndex = -1;

  constructor(
    public dialogRef: MatDialogRef<BancaiListComponent, BancaiListOutput>,
    @Inject(MAT_DIALOG_DATA) public data: BancaiListInput,
    private message: MessageService
  ) {
    const {checkedItems} = this.data || {};
    let list = this.data.list;
    if (checkedItems) {
      if (!this.data.multi) {
        const checkedItem = checkedItems[0];
        if (checkedItem) {
          this.zidingyi = checkedItem.zidingyi || "";
        }
      }
    }
    const checkedItemNames = checkedItems?.map((v) => v.mingzi) || [];
    if (this.data.multi) {
      list = [{mingzi: "全部", cailiaoList: [], houduList: [], guigeList: []}, ...list];
    }
    this.list = list.map((bancai) => ({bancai, hidden: false, checked: checkedItemNames.includes(bancai.mingzi)}));
    this.loadFilterText();
    this.filterList();
    setGlobal("bancai", this);
  }

  submit() {
    const bancais: BancaiList[] = [];
    for (const item of this.list) {
      if (!item.checked) {
        continue;
      }
      const bancai = item.bancai;
      if (bancai.mingzi === "自定义") {
        bancai.zidingyi = this.zidingyi;
      }
      bancais.push(bancai);
    }
    this.dialogRef.close(bancais);
  }

  cancel() {
    this.dialogRef.close();
  }

  filterList() {
    const text = this.filterText;
    this.zidingyiIndex = -1;
    for (const [i, item] of this.list.entries()) {
      item.hidden = !queryString(text, item.bancai.mingzi);
      if (!item.hidden && item.bancai.mingzi === "自定义") {
        this.zidingyiIndex = i;
      }
    }
  }

  saveFilterText() {
    session.save("bancaiListSearchText", this.filterText);
  }

  loadFilterText() {
    this.filterText = session.load("bancaiListSearchText") || "";
  }

  async onCheckboxChange(item: BancaiListComponent["list"][number]) {
    const bancai = item.bancai;
    const checked = item.checked;
    const checkedArr = this.list.map((v) => v.checked);
    if (!this.data.multi) {
      this.list.forEach((v) => (v.checked = false));
    }
    if (bancai.mingzi === "自定义") {
      await timeout(0);
      const zidingyi = await this.message.prompt(
        {type: "string", label: "自定义板材", value: this.zidingyi, validators: Validators.required},
        {title: "自定义板材"}
      );
      if (zidingyi) {
        this.zidingyi = zidingyi;
      } else {
        for (const [i, v] of this.list.entries()) {
          v.checked = checkedArr[i];
        }
        return;
      }
    }
    item.checked = !checked;
  }

  selectZidingyi() {
    this.onCheckboxChange(this.list[this.zidingyiIndex]);
  }
}

export const openBancaiListDialog = getOpenDialogFunc<BancaiListComponent, BancaiListInput, BancaiListOutput>(BancaiListComponent, {
  width: "85%",
  height: "85%"
});

export interface BancaiListInput {
  list: BancaiList[];
  checkedItems?: BancaiList[];
  multi?: boolean;
}

export type BancaiListOutput = BancaiList[];
