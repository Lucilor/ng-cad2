import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@src/app/cad-viewer";
import {getOpenDialogFunc} from "../dialog.common";

export type CadDataAttrsComponentData = CadData["attributes"];

@Component({
    selector: "app-cad-data-attrs",
    templateUrl: "./cad-data-attrs.component.html",
    styleUrls: ["./cad-data-attrs.component.scss"]
})
export class CadDataAttrsComponent {
    list: {key: string; value: string}[] = [];

    constructor(
        public dialogRef: MatDialogRef<CadDataAttrsComponent, CadDataAttrsComponentData>,
        @Inject(MAT_DIALOG_DATA) public data: CadDataAttrsComponentData
    ) {
        for (const key in data) {
            this.list.push({key, value: data[key]});
        }
        this._checkEmpty();
    }

    private _checkEmpty() {
        if (this.list.length < 1) {
            this.list.push({key: "", value: ""});
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

    add(i: number) {
        this.list.splice(i + 1, 0, {key: "", value: ""});
    }

    remove(i: number) {
        this.list.splice(i, 1);
        this._checkEmpty();
    }
}

type CDAC = CadDataAttrsComponentData;
export const openCadDataAttrsDialog = getOpenDialogFunc<CadDataAttrsComponent, CDAC, CDAC>(CadDataAttrsComponent);
