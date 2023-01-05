import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.types";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-mrbcjfz-dialog",
  templateUrl: "./mrbcjfz-dialog.component.html",
  styleUrls: ["./mrbcjfz-dialog.component.scss"]
})
export class MrbcjfzDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MrbcjfzDialogComponent, MrbcjfzDialogOutput>,
    @Inject(MAT_DIALOG_DATA) public data: MrbcjfzDialogInput
  ) {
    if (!data) {
      data = {id: 0, table: ""};
    }
  }

  submit(xinghao: MrbcjfzXinghaoInfo) {
    this.dialogRef.close(xinghao);
  }

  close() {
    this.dialogRef.close();
  }
}

export interface MrbcjfzDialogInput {
  id: number;
  table: string;
}

export type MrbcjfzDialogOutput = MrbcjfzXinghaoInfo;

export const openMrbcjfzDialog = getOpenDialogFunc<MrbcjfzDialogComponent, MrbcjfzDialogInput, MrbcjfzDialogOutput>(
  MrbcjfzDialogComponent,
  {width: "85%", height: "85%"}
);
