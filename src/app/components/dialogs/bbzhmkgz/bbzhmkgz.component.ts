import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {Utils} from "@mixins/utils.mixin";
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
    constructor(
        public dialogRef: MatDialogRef<BbzhmkgzComponent, BbzhmkgzComponentData>,
        @Inject(MAT_DIALOG_DATA) public data: BbzhmkgzComponentData
    ) {
        super();
    }

    submit() {
        this.dialogRef.close(this.data);
    }

    cancle() {
        this.dialogRef.close();
    }
}

export const openBbzhmkgzDialog = getOpenDialogFunc<BbzhmkgzComponent, BbzhmkgzComponentData, BbzhmkgzComponentData>(BbzhmkgzComponent);
