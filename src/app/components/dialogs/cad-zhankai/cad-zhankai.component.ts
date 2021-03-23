import {Component, Inject} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {fullChars2HalfChars, replaceChars} from "@src/app/app.common";
import {CadCondition, CadData, CadZhankai} from "@src/app/cad-viewer";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {openCadListDialog} from "../cad-list/cad-list.component";
import {openCadOptionsDialog} from "../cad-options/cad-options.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-cad-zhankai",
    templateUrl: "./cad-zhankai.component.html",
    styleUrls: ["./cad-zhankai.component.scss"]
})
export class CadZhankaiComponent {
    checkedIndices = new Set<number>();
    keysMap = {
        kaiqi: "开启",
        chanpinfenlei: "产品分类",
        flip: "翻转"
    };
    get emptyFlipItem() {
        return {kaiqi: "", chanpinfenlei: "", fanzhuan: false};
    }

    constructor(
        public dialogRef: MatDialogRef<CadZhankaiComponent, CadZhankai[]>,
        @Inject(MAT_DIALOG_DATA) public data: CadData["zhankai"],
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private message: MessageService
    ) {
        this.data = cloneDeep(this.data);
        this.data.forEach((item) => {
            this._checkZhankai(item);
        });
    }

    private _checkZhankai(item: CadZhankai) {
        if (item.conditions.length <= 0) {
            item.conditions.push(new CadCondition());
        }
        if (item.flip.length <= 0) {
            item.flip.push(this.emptyFlipItem);
        }
        return item;
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
        this.data.push(this._checkZhankai(new CadZhankai()));
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
        const str = (event.target as HTMLInputElement).value;
        condition.value = replaceChars(str, fullChars2HalfChars);
    }

    addCondition(conditions: CadCondition[], i: number) {
        conditions.splice(i + 1, 0, new CadCondition());
    }

    async removeCondition(conditions: CadCondition[], i: number) {
        if (conditions.length === 1) {
            conditions[0] = new CadCondition();
        } else {
            conditions.splice(i, 1);
        }
    }

    async selectOptions(obj: any, field: string) {
        const name = (this.keysMap as any)[field];
        const checkedItems = (obj[field] as string).split(",");
        const result = await openCadOptionsDialog(this.dialog, {data: {name, checkedItems}});
        if (Array.isArray(result)) {
            obj[field] = result.join(",");
        }
    }

    addFlipItem(i: number, j: number) {
        const item = this.data[i].flip;
        item.splice(j + 1, 0, this.emptyFlipItem);
    }

    removeFlipItem(i: number, j: number) {
        const item = this.data[i].flip;
        item.splice(j, 1);
        if (item.length <= 0) {
            item.push(this.emptyFlipItem);
        }
    }
}

export const openCadZhankaiDialog = getOpenDialogFunc<CadZhankaiComponent, CadZhankai[], CadZhankai[]>(CadZhankaiComponent);
