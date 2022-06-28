import {Component, Inject, OnInit} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {BancaiList} from "@modules/http/services/cad-data.service";
import {BehaviorSubject} from "rxjs";
import {getOpenDialogFunc} from "../dialog.common";

export interface BancaiListData {
    list: BancaiList[];
    selectMode: "single"; // | "multiple";
    checkedItems?: string[];
}

// export interface Bancai {

// }

@Component({
    selector: "app-bancai-list",
    templateUrl: "./bancai-list.component.html",
    styleUrls: ["./bancai-list.component.scss"]
})
export class BancaiListComponent implements OnInit {
    checkedIndex = new BehaviorSubject<number>(-1);

    constructor(public dialogRef: MatDialogRef<BancaiListComponent, BancaiList[]>, @Inject(MAT_DIALOG_DATA) public data: BancaiListData) {
        const {checkedItems, list} = this.data || {};
        if (checkedItems) {
            this.checkedIndex.next(list.findIndex((v) => checkedItems.includes(v.mingzi)));
        }
    }

    ngOnInit() {
        (window as any).b = this;
    }

    submit() {
        const i = this.checkedIndex.value;
        const bancai = this.data.list[i];
        this.dialogRef.close([bancai]);
    }

    cancle() {
        this.dialogRef.close();
    }
}

export const openBancaiListDialog = getOpenDialogFunc<BancaiListComponent, BancaiListData, BancaiList[]>(BancaiListComponent, {
    width: "85%",
    height: "85%"
});
