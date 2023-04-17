import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {BancaiCadExtend} from "@views/select-bancai/select-bancai.component";
import {getOpenDialogFunc} from "../dialog.common";

export interface SelectBancaiCadsData {
  cads: BancaiCadExtend[];
}

@Component({
  selector: "app-select-bancai-cads",
  templateUrl: "./select-bancai-cads.component.html",
  styleUrls: ["./select-bancai-cads.component.scss"]
})
export class SelectBancaiCadsComponent {
  get bancai() {
    return this.data.cads[0]?.bancai;
  }

  get checkedCads() {
    return this.data.cads.filter((v) => v.checked);
  }

  constructor(
    public dialogRef: MatDialogRef<SelectBancaiCadsComponent, string[]>,
    @Inject(MAT_DIALOG_DATA) public data: SelectBancaiCadsData
  ) {
    if (!Array.isArray(this.data.cads)) {
      this.data.cads = [];
    }
    console.log(this.data);
  }

  submit() {
    this.dialogRef.close(this.checkedCads.map((v) => v.id));
  }

  close() {
    this.dialogRef.close();
  }

  autoCheck() {
    this.data.cads.forEach((cad) => (cad.checked = cad.oversized));
  }

  selectAll() {
    this.data.cads.forEach((cad) => (cad.checked = true));
  }

  unselectAll() {
    this.data.cads.forEach((cad) => (cad.checked = false));
  }

  disable() {
    this.data.cads.forEach((cad) => (cad.disabled = cad.checked));
  }

  enable() {
    this.data.cads.forEach((cad) => (cad.disabled = !cad.checked));
  }
}

export const openSelectBancaiCadsDialog = getOpenDialogFunc<SelectBancaiCadsComponent, SelectBancaiCadsData, string[]>(
  SelectBancaiCadsComponent
);
