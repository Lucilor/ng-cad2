import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {Utils} from "@mixins/utils.mixin";
import {getOpenDialogFunc} from "../dialog.common";

export type CadDataAttrsComponentData = CadData["attributes"];

@Component({
    selector: "app-cad-data-attrs",
    templateUrl: "./cad-data-attrs.component.html",
    styleUrls: ["./cad-data-attrs.component.scss"]
})
export class CadDataAttrsComponent extends Utils() {
    list: {key: string; value: string}[] = [];

    constructor(
        public dialogRef: MatDialogRef<CadDataAttrsComponent, CadDataAttrsComponentData>,
        @Inject(MAT_DIALOG_DATA) public data: CadDataAttrsComponentData
    ) {
        super();
        for (const key in data) {
            this.list.push({key, value: data[key]});
        }
    }

    submit() {
        const data: CadDataAttrsComponentData = {};
        this.list.forEach((v) => {
            if (v.key) {
                data[v.key] = v.value;
            }
        });
        this.dialogRef.close(data);
    }

    cancle() {
        this.dialogRef.close();
    }
}

type CDAC = CadDataAttrsComponentData;
export const openCadDataAttrsDialog = getOpenDialogFunc<CadDataAttrsComponent, CDAC, CDAC>(CadDataAttrsComponent);
