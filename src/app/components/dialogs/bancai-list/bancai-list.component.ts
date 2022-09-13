import {Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {BancaiList} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/types";
import {session} from "@src/app/app.common";
import {debounce} from "lodash";
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
export class BancaiListComponent {
    checkedIndex = new BehaviorSubject<number>(-1);
    filterText = "";
    filterInputInfo: InputInfo = {
        type: "string",
        label: "搜索",
        model: {key: "filterText", data: this},
        autoFocus: true,
        onInput: debounce((v) => {
            this.filterList();
            this.saveFilterText();
        }, 500)
    };
    list: {bancai: BancaiList; hidden: boolean}[] = [];

    constructor(public dialogRef: MatDialogRef<BancaiListComponent, BancaiList[]>, @Inject(MAT_DIALOG_DATA) public data: BancaiListData) {
        const {checkedItems, list} = this.data || {};
        if (checkedItems) {
            this.checkedIndex.next(list.findIndex((v) => checkedItems.includes(v.mingzi)));
        }
        this.list = list.map((bancai) => ({bancai, hidden: false}));
        this.loadFilterText();
        this.filterList();
    }

    submit() {
        const i = this.checkedIndex.value;
        const bancai = this.data.list[i];
        this.dialogRef.close([bancai]);
    }

    cancel() {
        this.dialogRef.close();
    }

    filterList() {
        const text = this.filterText;
        for (const item of this.list) {
            item.hidden = !!text && !item.bancai.mingzi.includes(text);
        }
    }

    saveFilterText() {
        session.save("bancaiListSearchText", this.filterText);
        console.log(session.load("bancaiListSearchText"));
    }

    loadFilterText() {
        this.filterText = session.load("bancaiListSearchText") || "";
    }
}

export const openBancaiListDialog = getOpenDialogFunc<BancaiListComponent, BancaiListData, BancaiList[]>(BancaiListComponent, {
    width: "85%",
    height: "85%"
});
