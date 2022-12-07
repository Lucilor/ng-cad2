import {Component, Inject} from "@angular/core";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {openCadOptionsDialog} from "../cad-options/cad-options.component";
import {getOpenDialogFunc} from "../dialog.common";

export type CadLineTjqzSelectData = {value?: {key: string; value: string}; options: {key: string; value: string}[]};

@Component({
  selector: "app-cad-line-tjqz-select",
  templateUrl: "./cad-line-tjqz-select.component.html",
  styleUrls: ["./cad-line-tjqz-select.component.scss"]
})
export class CadLineTjqzSelectComponent {
  constructor(
    public dialogRef: MatDialogRef<CadLineTjqzSelectComponent, CadLineTjqzSelectData>,
    @Inject(MAT_DIALOG_DATA) public data: CadLineTjqzSelectData,
    private dialog: MatDialog,
    private message: MessageService
  ) {
    this.data = cloneDeep(this.data);
  }

  async onListClick(item: CadLineTjqzSelectData["options"][0]) {
    const name = item.key;
    const checkedItems = item.value.split("*");
    const result = await openCadOptionsDialog(this.dialog, {data: {data: new CadData(), name, checkedItems}});
    if (result) {
      item.value = result.join("*");
    }
  }

  submit() {
    for (const item of this.data.options) {
      if (!item.value) {
        this.message.alert("请不要留空！");
        return;
      }
    }
    this.dialogRef.close(this.data);
  }

  close() {
    this.dialogRef.close();
  }
}

type T = CadLineTjqzSelectComponent;
export const openCadLineTjqzSelectDialog = getOpenDialogFunc<T, CadLineTjqzSelectData, CadLineTjqzSelectData>(CadLineTjqzSelectComponent);
