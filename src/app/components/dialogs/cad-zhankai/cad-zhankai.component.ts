import {Component, Inject} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {CadCondition, CadData, CadZhankai} from "@src/app/cad-viewer";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {openCadListDialog} from "../cad-list/cad-list.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-cad-zhankai",
    templateUrl: "./cad-zhankai.component.html",
    styleUrls: ["./cad-zhankai.component.scss"]
})
export class CadZhankaiComponent {
    checkedIndices = new Set<number>();

    constructor(
        public dialogRef: MatDialogRef<CadZhankaiComponent, CadZhankai[]>,
        @Inject(MAT_DIALOG_DATA) public data: CadData["zhankai"],
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private message: MessageService
    ) {
        this.data = cloneDeep(this.data);
        this.data.forEach((item) => {
            if (item.conditions.length <= 0) {
                item.conditions.push(new CadCondition());
            }
        });
    }

    submit() {
        this.dialogRef.close(this.data);
    }

    cancle() {
        this.dialogRef.close();
    }

    openCadmuban(item: CadZhankai, key: "kailiaomuban" | "neikaimuban") {
        if (item[key]) {
            const params = {...this.route.snapshot.queryParams};
            params.collection = "kailiaocadmuban";
            params.id = item[key];
            open("index?" + new URLSearchParams(params).toString());
        }
    }

    async selectCadmuban(item: CadZhankai, key: "kailiaomuban" | "neikaimuban") {
        const checkedItems = [new CadData({id: item[key]})];
        const result = await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}});
        if (result?.length) {
            item[key] = result[0].id;
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
        this.data.push(new CadZhankai());
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

    setCondition(event: Event, condition: CadCondition) {
        condition.value = (event.target as HTMLInputElement).value;
    }

    addCondition(conditions: CadCondition[], i: number) {
        conditions.splice(i + 1, 0, new CadCondition());
    }

    async removeCondition(conditions: CadCondition[], i: number) {
        if (await this.message.confirm("是否确定删除？")) {
            if (conditions.length === 1) {
                conditions[0] = new CadCondition();
            } else {
                conditions.splice(i, 1);
            }
        }
    }
}

export const openCadZhankaiDialog = getOpenDialogFunc<CadZhankaiComponent, CadZhankai[], CadZhankai[]>(CadZhankaiComponent);
