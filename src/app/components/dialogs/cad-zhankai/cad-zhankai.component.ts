import {Component, Inject} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {CadData, CadZhankai, FlipType} from "@src/app/cad-viewer";
import {Utils} from "@src/app/mixins/utils.mixin";
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
export class CadZhankaiComponent extends Utils() {
    checkedIndices = new Set<number>();
    keysMap = {
        kaiqi: "开启",
        chanpinfenlei: "产品分类",
        flip: "翻转"
    };
    flipOptions: {name: string; value: FlipType}[] = [
        {name: "无", value: ""},
        {name: "水平翻转", value: "h"},
        {name: "垂直翻转", value: "v"},
        {name: "水平垂直翻转", value: "vh"}
    ];
    get emptyFlipItem(): CadZhankai["flip"][0] {
        return {kaiqi: "", chanpinfenlei: "", fanzhuanfangshi: ""};
    }

    constructor(
        public dialogRef: MatDialogRef<CadZhankaiComponent, CadZhankai[]>,
        @Inject(MAT_DIALOG_DATA) public data: CadData["zhankai"],
        private route: ActivatedRoute,
        private dialog: MatDialog,
        private message: MessageService
    ) {
        super();
        this.data = cloneDeep(this.data);
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

    async selectOptions(obj: any, field: string) {
        const name = (this.keysMap as any)[field];
        const checkedItems = (obj[field] as string).split(",");
        const result = await openCadOptionsDialog(this.dialog, {data: {name, checkedItems}});
        if (Array.isArray(result)) {
            obj[field] = result.join(",");
        }
    }

    async addFlipChai(i: number) {
        const result = await this.message.prompt({promptData: {placeholder: "请输入序号", type: "number"}});
        if (typeof result === "string" && result) {
            const num = Number(result);
            if (!(num > 0)) {
                this.message.snack("请输入大于0的数字");
                return;
            }
            const flipChai = this.data[i].flipChai;
            if (flipChai[num] !== undefined) {
                this.message.snack("该序号已存在");
                return;
            }
            flipChai[num] = "h";
        }
    }

    removeFlipChai(i: number, key: string) {
        delete this.data[i].flipChai[key];
    }
}

export const openCadZhankaiDialog = getOpenDialogFunc<CadZhankaiComponent, CadZhankai[], CadZhankai[]>(CadZhankaiComponent);
