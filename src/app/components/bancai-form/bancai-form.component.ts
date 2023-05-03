import {Component, Input} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {openBancaiListDialog} from "@components/dialogs/bancai-list/bancai-list.component";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";

@Component({
  selector: "app-bancai-form",
  templateUrl: "./bancai-form.component.html",
  styleUrls: ["./bancai-form.component.scss"]
})
export class BancaiFormComponent {
  private _data: BancaiFormData = {bancai: "", cailiao: "", houdu: ""};
  @Input()
  get data() {
    return this._data;
  }
  set data(value) {
    this._data = value;
    this.update();
  }
  private _bancaiList: BancaiList[] = [];
  @Input()
  get bancaiList() {
    return this._bancaiList;
  }
  set bancaiList(value) {
    this._bancaiList = value;
    this.update();
  }
  bancaiInputInfo?: InputInfo<BancaiFormData>;
  cailiaoInputInfo?: InputInfo<BancaiFormData>;
  houduInputInfo?: InputInfo<BancaiFormData>;
  kexuanbancaiInputInfo?: InputInfo<BancaiFormData>;
  get inputInfos() {
    return [this.bancaiInputInfo, this.cailiaoInputInfo, this.houduInputInfo, this.kexuanbancaiInputInfo].filter(Boolean) as InputInfo[];
  }

  constructor(private dialog: MatDialog) {}

  update() {
    const checkedItem = this.bancaiList.find((v) => v.mingzi === this.data.bancai);
    if (checkedItem) {
      this.data.bancai = checkedItem.mingzi;
      if (checkedItem.cailiaoList.length === 1) {
        this.data.cailiao = checkedItem.cailiaoList[0];
      } else if (!checkedItem.cailiaoList.includes(this.data.cailiao)) {
        this.data.cailiao = "";
      }
      if (checkedItem.houduList.length === 1) {
        this.data.houdu = checkedItem.houduList[0];
      } else if (!checkedItem.houduList.includes(this.data.houdu)) {
        this.data.houdu = "";
      }
    }
    this.bancaiInputInfo = {
      type: "string",
      label: "板材",
      value: this.data.bancai,
      readonly: true,
      suffixIcons: [
        {
          name: "list",
          onClick: async () => {
            const result = await openBancaiListDialog(this.dialog, {
              data: {list: this.bancaiList, checkedItems: checkedItem ? [checkedItem] : undefined}
            });
            if (result?.[0]) {
              this.data.bancai = result[0].mingzi;
              this.update();
            }
          }
        }
      ]
    };
    this.cailiaoInputInfo = {
      type: "select",
      label: "材料",
      model: {key: "cailiao", data: this.data},
      options: checkedItem?.cailiaoList || []
    };
    this.houduInputInfo = {type: "select", label: "厚度", model: {key: "houdu", data: this.data}, options: checkedItem?.houduList || []};
    const kexuanbancai = this.data.kexuanbancai;
    if (Array.isArray(kexuanbancai)) {
      const checkedItems = this.bancaiList.filter((v) => kexuanbancai.includes(v.mingzi));
      if (kexuanbancai.includes("全部")) {
        checkedItems.push({mingzi: "全部", cailiaoList: [], guigeList: [], houduList: []});
      }
      this.kexuanbancaiInputInfo = {
        type: "string",
        label: "可选板材",
        value: kexuanbancai.join("*"),
        readonly: true,
        suffixIcons: [
          {
            name: "list",
            onClick: async () => {
              const result = await openBancaiListDialog(this.dialog, {data: {list: this.bancaiList, checkedItems, multi: true}});
              if (result?.[0]) {
                this.data.kexuanbancai = result.map((v) => v.mingzi);
                this.update();
              }
            }
          }
        ]
      };
    }
  }

  set() {}
}

export interface BancaiFormData {
  bancai: string;
  cailiao: string;
  houdu: string;
  kexuanbancai?: string[];
}
