import {Component, Inject} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {BancaiCadExtend} from "@src/app/views/select-bancai/select-bancai.component";

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
}

export async function openSelectBancaiCadsDialog(dialog: MatDialog, config: MatDialogConfig<SelectBancaiCadsData>) {
    const ref = dialog.open<SelectBancaiCadsComponent, SelectBancaiCadsData, string[]>(SelectBancaiCadsComponent, config);
    return await ref.afterClosed().toPromise();
}
