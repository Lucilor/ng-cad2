import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {BancaiFormData} from "@components/bancai-form/bancai-form.component";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-bancai-form-dialog",
  templateUrl: "./bancai-form-dialog.component.html",
  styleUrls: ["./bancai-form-dialog.component.scss"]
})
export class BancaiFormDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BancaiFormDialogComponent, BancaiFormOutput>,
    @Inject(MAT_DIALOG_DATA) public data: BancaiFormInput,
    private message: MessageService
  ) {
    if (!this.data) {
      this.data = {data: {bancai: "", cailiao: "", houdu: ""}, bancaiList: []};
    }
  }

  submit() {
    const data = {...this.data.data};
    const emptyKeys: string[] = [];
    if (!data.bancai) {
      emptyKeys.push("板材");
    }
    if (!data.cailiao) {
      emptyKeys.push("材料");
    }
    if (!data.houdu) {
      emptyKeys.push("厚度");
    }
    if (emptyKeys.length > 0) {
      this.message.error(`${emptyKeys.join("/")}不能为空`);
      return;
    }
    this.dialogRef.close(data);
  }

  cancel() {
    this.dialogRef.close();
  }
}

export interface BancaiFormInput {
  data: BancaiFormData;
  bancaiList: BancaiList[];
}

export type BancaiFormOutput = BancaiFormData;

export const openBancaiFormDialog = getOpenDialogFunc<BancaiFormDialogComponent, BancaiFormInput, BancaiFormOutput>(
  BancaiFormDialogComponent,
  {width: "85%"}
);
