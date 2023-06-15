import {Component, Inject} from "@angular/core";
import {AbstractControl, ValidatorFn} from "@angular/forms";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {getFormControl, getFormGroup, TypedFormGroup} from "@app/app.common";
import {getOpenDialogFunc} from "@components/dialogs/dialog.common";
import {CadDimensionLinear} from "@lucilor/cad-viewer";
import {FontStyle} from "src/cad-viewer/src/cad-data/cad-styles";

export interface CadDimensionData {
  data: CadDimensionLinear;
}

export interface CadDimensionForm {
  mingzi: CadDimensionLinear["mingzi"];
  xianshigongshiwenben: CadDimensionLinear["xianshigongshiwenben"];
  qujian: CadDimensionLinear["qujian"];
  e1Location: CadDimensionLinear["entity1"]["location"];
  e2Location: CadDimensionLinear["entity2"]["location"];
  axis: CadDimensionLinear["axis"];
  ref: CadDimensionLinear["ref"];
  distance: CadDimensionLinear["distance"];
  fontSize: Required<FontStyle>["size"];
  cad1: CadDimensionLinear["cad1"];
  cad2: CadDimensionLinear["cad2"];
  quzhifanwei: CadDimensionLinear["quzhifanwei"];
  hideDimLines: CadDimensionLinear["hideDimLines"];
  xiaoshuchuli: CadDimensionLinear["xiaoshuchuli"];
}

@Component({
  selector: "app-cad-dimension-form",
  templateUrl: "./cad-dimension-form.component.html",
  styleUrls: ["./cad-dimension-form.component.scss"]
})
export class CadDimensionFormComponent {
  form: TypedFormGroup<CadDimensionForm>;
  dimension: CadDimensionLinear;
  constructor(
    public dialogRef: MatDialogRef<CadDimensionFormComponent, CadDimensionLinear>,
    @Inject(MAT_DIALOG_DATA) public data: CadDimensionData
  ) {
    const dimension = this.data.data || new CadDimensionLinear();
    this.dimension = dimension;
    this.form = getFormGroup<CadDimensionForm>({
      mingzi: getFormControl(dimension.mingzi),
      xianshigongshiwenben: getFormControl(dimension.xianshigongshiwenben),
      qujian: getFormControl(dimension.qujian, {validators: this.qujianValidator()}),
      e1Location: getFormControl(dimension.entity1?.location),
      e2Location: getFormControl(dimension.entity2?.location),
      axis: getFormControl(dimension.axis),
      ref: getFormControl<CadDimensionLinear["ref"]>(dimension.ref),
      distance: getFormControl(dimension.distance),
      fontSize: getFormControl(dimension.style?.text?.size || 0),
      cad1: getFormControl({value: dimension.cad1, disabled: true}),
      cad2: getFormControl({value: dimension.cad2, disabled: true}),
      quzhifanwei: getFormControl(dimension.quzhifanwei),
      hideDimLines: getFormControl(dimension.hideDimLines),
      xiaoshuchuli: getFormControl(dimension.xiaoshuchuli)
    });
  }

  submit() {
    if (this.form.untouched) {
      this.form.markAllAsTouched();
    }
    if (this.form.valid) {
      const value = this.form.value as Required<CadDimensionFormComponent["form"]["value"]>;
      const dimension = this.dimension;
      dimension.mingzi = value.mingzi;
      dimension.xianshigongshiwenben = value.xianshigongshiwenben;
      dimension.qujian = value.qujian;
      dimension.entity1.location = value.e1Location;
      dimension.entity2.location = value.e2Location;
      dimension.axis = value.axis;
      dimension.distance = value.distance;
      dimension.setStyle({text: {size: value.fontSize}});
      dimension.ref = value.ref;
      dimension.quzhifanwei = value.quzhifanwei;
      dimension.hideDimLines = value.hideDimLines;
      dimension.xiaoshuchuli = value.xiaoshuchuli;
      this.dialogRef.close(dimension);
    } else {
      this.form.controls.qujian.updateValueAndValidity();
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  mqValidator(): ValidatorFn {
    return () => {
      if (!this.form) {
        return null;
      }
      const controls = this.form.controls;
      if (controls.qujian.value || controls.mingzi.value) {
        return null;
      }
      return {mqNull: "区间和名字不能同时为空"};
    };
  }

  qujianValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const err = {qujian: "区间应有且仅有一个~或-，且该符号不位于开头或结尾。"};
      return !control.value || control.value.match(/^[^-~]+(-|~)[^-~]+$/) ? null : err;
    };
  }

  checkMqNull() {
    const controls = this.form.controls;
    if (controls.mingzi.hasError("mqNull")) {
      return controls.mingzi.errors?.mqNull;
    }
    if (controls.qujian.hasError("mqNull")) {
      return controls.qujian.errors?.mqNull;
    }
    return "";
  }

  checkQujian() {
    return this.form.controls.qujian.errors?.qujian;
  }

  getHideDimLines() {
    return this.form.controls.hideDimLines.value;
  }

  setHideDimLines(event: MatSlideToggleChange) {
    this.form.controls.hideDimLines.setValue(event.checked);
  }
}

export const openCadDimensionFormDialog = getOpenDialogFunc<CadDimensionFormComponent, CadDimensionData, CadDimensionLinear>(
  CadDimensionFormComponent,
  {height: "65%"}
);
