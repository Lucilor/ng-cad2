import {Component, Inject, ViewChild} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {Formulas} from "@app/utils/calc";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
  selector: "app-edit-formulas-dialog",
  templateUrl: "./edit-formulas-dialog.component.html",
  styleUrls: ["./edit-formulas-dialog.component.scss"]
})
export class EditFormulasDialogComponent {
  @ViewChild("formulasEditor") formulasEditor?: FormulasEditorComponent;

  constructor(
    public dialogRef: MatDialogRef<EditFormulasDialogComponent, EditFormulasOutput>,
    @Inject(MAT_DIALOG_DATA) public data?: EditFormulasInput
  ) {}

  submit() {
    this.dialogRef.close(this.formulasEditor?.getFormulas());
  }

  cancel() {
    this.dialogRef.close();
  }
}

export const openEditFormulasDialog = getOpenDialogFunc<EditFormulasDialogComponent, EditFormulasInput, EditFormulasOutput>(
  EditFormulasDialogComponent,
  {width: "calc(100vw - 20px)", height: "calc(100vh - 10px)", disableClose: true}
);

export interface EditFormulasInput {
  formulas?: Formulas;
}

export type EditFormulasOutput = Formulas;
