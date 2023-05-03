import {Component, Inject, OnInit, ViewChild} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadEditorComponent} from "@modules/cad-editor/components/cad-editor/cad-editor.component";
import {AppStatusService, OpenCadOptions} from "@services/app-status.service";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-cad-editor-dialog",
  templateUrl: "./cad-editor-dialog.component.html",
  styleUrls: ["./cad-editor-dialog.component.scss"]
})
export class CadEditorDialogComponent extends Subscribed() implements OnInit {
  @ViewChild(CadEditorComponent) cadEditor?: CadEditorComponent;
  isSaved = false;
  canClose = true;

  constructor(
    public dialogRef: MatDialogRef<CadEditorDialogComponent, CadEditorOutput>,
    @Inject(MAT_DIALOG_DATA) public data: CadEditorInput,
    private status: AppStatusService
  ) {
    super();
    if (!this.data) {
      this.data = {};
    }
  }

  ngOnInit() {
    this.subscribe(this.status.saveCadStart$, () => {
      this.canClose = false;
    });
    this.subscribe(this.status.saveCadEnd$, () => {
      this.canClose = true;
      this.isSaved = true;
    });
  }

  async save() {
    if (this.cadEditor) {
      await this.cadEditor.save();
    }
  }

  async close(save: boolean) {
    if (save) {
      await this.save();
    }
    if (this.cadEditor) {
      this.dialogRef.close({isSaved: this.isSaved});
    } else {
      this.dialogRef.close();
    }
  }
}

export const openCadEditorDialog = getOpenDialogFunc<CadEditorDialogComponent, CadEditorInput, CadEditorOutput>(CadEditorDialogComponent, {
  width: "90%",
  height: "90%",
  disableClose: true
});

export type CadEditorInput = OpenCadOptions;

export interface CadEditorOutput {
  isSaved: boolean;
}
