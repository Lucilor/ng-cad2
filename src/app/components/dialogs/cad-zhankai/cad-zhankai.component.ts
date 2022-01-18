import {Component, Inject} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {ErrorStateMatcher} from "@angular/material/core";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {splitOptions, joinOptions} from "@app/app.common";
import {CadZhankai, CadData, FlipType} from "@cad-viewer";
import {Utils} from "@mixins/utils.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf} from "@utils";
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
        {name: "水平翻转", value: "h"}
    ];
    get emptyFlipItem(): CadZhankai["flip"][0] {
        return {kaiqi: "", chanpinfenlei: "", fanzhuanfangshi: ""};
    }
    nameErrorMsg: string[] = [];
    nameMatcher: ErrorStateMatcher = {
        isErrorState: (control) => {
            const value = control?.value;
            if (!value) {
                return true;
            }
            return this.data.filter((v) => v.name === value).length > 1;
        }
    };
    get valid() {
        return this.nameErrorMsg.every((v) => !v);
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
        if (this.valid) {
            this.dialogRef.close(this.data);
        }
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
        const checkedItems = [item[key]];
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
        this.validateNames();
    }

    selectAll() {
        this.data.forEach((_v, i) => this.checkedIndices.add(i));
        this.checkedIndices.delete(0);
    }

    unselectAll() {
        this.checkedIndices.clear();
    }

    copyItem(i: number) {
        this.data.splice(i + 1, 0, cloneDeep(this.data[i]));
    }

    removeItem(i: number) {
        if (i === 0) {
            this.message.alert("不能删除第一项");
        } else {
            this.data.splice(i, 1);
        }
    }

    async selectOptions(obj: any, field: string) {
        const name = (this.keysMap as any)[field];
        const checkedItems = splitOptions(obj[field]);
        const result = await openCadOptionsDialog(this.dialog, {data: {name, checkedItems}});
        if (Array.isArray(result)) {
            obj[field] = joinOptions(result);
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

    validateNames() {
        const names: string[] = [];
        this.nameErrorMsg = [];
        this.data.forEach((v, i) => {
            this.nameErrorMsg[i] = v.name ? "" : "名字不能为空";
            if (v.name) {
                this.nameErrorMsg[i] = "";
                names.push(v.name);
            } else {
                this.nameErrorMsg[i] = "名字不能为空";
            }
        });
        const map: ObjectOf<number[]> = {};
        names.forEach((v, i) => (map[v] ? map[v].push(i) : (map[v] = [i])));
        for (const v in map) {
            if (map[v].length > 1) {
                map[v].forEach((i) => (this.nameErrorMsg[i] = "名字不能重复"));
            }
        }
    }
}

export const openCadZhankaiDialog = getOpenDialogFunc<CadZhankaiComponent, CadZhankai[], CadZhankai[]>(CadZhankaiComponent);

export const editCadZhankai = async (dialog: MatDialog, data: CadData) => {
    const result = await openCadZhankaiDialog(dialog, {data: data.zhankai});
    if (result) {
        data.zhankai = result;
        if (result.length) {
            data.name = result[0].name;
        }
    }
};
