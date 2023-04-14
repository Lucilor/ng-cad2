import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {Utils} from "@mixins/utils.mixin";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {getOpenDialogFunc} from "../dialog.common";

export interface BbzhmkgzComponentData {
  value: string;
  vars: CadData["info"]["vars"];
}

@Component({
  selector: "app-bbzhmkgz",
  templateUrl: "./bbzhmkgz.component.html",
  styleUrls: ["./bbzhmkgz.component.scss"]
})
export class BbzhmkgzComponent extends Utils() {
  inputInfo: InputInfo = {type: "string", textarea: {}, label: ""};

  constructor(
    public dialogRef: MatDialogRef<BbzhmkgzComponent, BbzhmkgzComponentData>,
    @Inject(MAT_DIALOG_DATA) public data: BbzhmkgzComponentData,
    private message: MessageService
  ) {
    super();
    if (!data.value) {
      data.value = "";
    }
    if (!data.vars) {
      data.vars = {};
    }
    this.inputInfo.model = {data, key: "value"};
  }

  submit() {
    const {errors} = window.parseBaobianzhengmianRules("修改包边正面宽规则:\n" + this.data.value, this.data.vars);
    if (errors.length > 0) {
      this.message.alert({content: errors.join("<br>"), title: "包边正面宽规则有误"});
      return;
    }
    this.dialogRef.close(this.data);
  }

  cancel() {
    this.dialogRef.close();
  }
}

export const openBbzhmkgzDialog = getOpenDialogFunc<BbzhmkgzComponent, BbzhmkgzComponentData, BbzhmkgzComponentData>(BbzhmkgzComponent);
