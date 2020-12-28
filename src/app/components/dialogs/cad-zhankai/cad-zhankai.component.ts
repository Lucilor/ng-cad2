import {Component, Inject} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {CadData, getZhankai} from "@src/app/cad-viewer";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {openCadListDialog} from "../cad-list/cad-list.component";
import {getOpenDialogFunc} from "../dialog.common";

export type CadZhankaiData = CadData["zhankai"];

@Component({
    selector: "app-cad-zhankai",
    templateUrl: "./cad-zhankai.component.html",
    styleUrls: ["./cad-zhankai.component.scss"]
})
export class CadZhankaiComponent {
    checkedIndices = new Set<number>();

    constructor(
        public dialogRef: MatDialogRef<CadZhankaiComponent, CadZhankaiData>,
        @Inject(MAT_DIALOG_DATA) public data: CadData["zhankai"],
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private message: MessageService
    ) {
        this.data = cloneDeep(this.data);
    }

    submit() {
        this.dialogRef.close(this.data);
    }

    cancle() {
        this.dialogRef.close();
    }

    openCadmuban(item: CadZhankaiData[0]) {
        if (item.kailiaomuban) {
            const params = {...this.route.snapshot.queryParams};
            params.collection = "kailiaocadmuban";
            params.id = item.kailiaomuban;
            open("index?" + new URLSearchParams(params).toString());
        }
    }

    async selectCadmuban(item: CadZhankaiData[0]) {
        const checkedItems = [new CadData({id: item.kailiaomuban})];
        const result = await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}});
        if (result?.length) {
            item.kailiaomuban = result[0].id;
        }
    }

    onCheckboxChange(event: MatCheckboxChange, i: number) {
        if (event.checked) {
            this.checkedIndices.add(i);
        } else {
            this.checkedIndices.delete(i);
        }
    }

    onCheckboxChanglick(event: Event) {
        event.stopPropagation();
    }

    addItem() {
        this.data.push(getZhankai());
    }

    selectAll() {
        this.data.forEach((_v, i) => this.checkedIndices.add(i));
        this.checkedIndices.delete(0);
    }

    unselectAll() {
        this.checkedIndices.clear();
    }

    copyItems() {
        const indices = this.checkedIndices;
        if (indices.size) {
            this.data = this.data.concat(cloneDeep(this.data.filter((_v, i) => indices.has(i))));
        } else {
            this.message.alert("没有选中");
        }
    }

    removeItems() {
        const indices = this.checkedIndices;
        if (indices.has(0)) {
            this.message.alert("不能删除第一项");
        } else if (indices.size) {
            this.data = this.data.filter((_v, i) => !indices.has(i));
            indices.clear();
        } else {
            this.message.alert("没有选中");
        }
    }
}

export const openCadZhankaiDialog = getOpenDialogFunc<CadZhankaiComponent, CadZhankaiData, CadZhankaiData>(CadZhankaiComponent);
