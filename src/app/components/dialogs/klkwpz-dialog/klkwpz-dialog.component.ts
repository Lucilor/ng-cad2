import {Component, Inject, ViewChild} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {KlkwpzSource} from "@components/klkwpz/klkwpz";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-klkwpz-dialog",
  templateUrl: "./klkwpz-dialog.component.html",
  styleUrls: ["./klkwpz-dialog.component.scss"]
})
export class KlkwpzDialogComponent {
  @ViewChild(KlkwpzComponent) klkwpzComponent?: KlkwpzComponent;

  constructor(public dialogRef: MatDialogRef<KlkwpzDialogComponent, KlkwpzSource>, @Inject(MAT_DIALOG_DATA) public data: KlkwpzDialogData) {
    if (!data.source || typeof data.source !== "object" || Array.isArray(data.source)) {
      data.source = {};
    }
  }

  submit() {
    if (this.klkwpzComponent && this.klkwpzComponent.submit()) {
      this.dialogRef.close(this.klkwpzComponent.klkwpz.export());
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}

export interface KlkwpzDialogData {
  source: KlkwpzSource;
  cadId?: string;
}

export const openKlkwpzDialog = getOpenDialogFunc<KlkwpzDialogComponent, KlkwpzDialogData, KlkwpzSource>(KlkwpzDialogComponent, {
  width: "85%",
  height: "85%"
});
