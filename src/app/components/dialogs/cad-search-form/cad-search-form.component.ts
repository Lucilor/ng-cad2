import {Component, OnInit} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {CadSearchData, CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf, timeout} from "@utils";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-cad-search-form",
    templateUrl: "./cad-search-form.component.html",
    styleUrls: ["./cad-search-form.component.scss"]
})
export class CadSearchFormComponent implements OnInit {
    data: CadSearchData = [];
    form: ObjectOf<string[]> = {};
    additional: CadSearchData[0] = {title: "自由选择", items: []};

    constructor(
        public dialogRef: MatDialogRef<CadSearchFormComponent, CadData["options"]>,
        private dataservice: CadDataService,
        private message: MessageService
    ) {}

    async ngOnInit() {
        await timeout(0);
        this.data = await this.dataservice.getCadSearchForm();
        this.data.push(this.additional);
        this.reset();
    }

    async addOption() {
        const name = (await this.message.prompt({promptData: {placeholder: "请输入选项名字"}})) as string;
        const isExist = this.data.find((v) => v.items.some((vv) => vv.label === name));
        if (isExist) {
            this.message.alert("选项已存在");
        } else {
            const item = await this.dataservice.getCadSearchOptions(name);
            if (item) {
                this.additional.items.push(item);
                this.form[item.label] = [];
            }
        }
    }

    submit() {
        const result: CadData["options"] = {};
        for (const name in this.form) {
            if (this.form[name].length) {
                const value = this.form[name].join(",");
                result[name] = value;
            }
        }
        this.dialogRef.close(result);
    }

    cancle() {
        this.dialogRef.close();
    }

    reset() {
        this.form = {};
        this.data.forEach((v) => v.items.forEach((vv) => (this.form[vv.label] = [])));
    }
}

export const openCadSearchFormDialog = getOpenDialogFunc<CadSearchFormComponent, CadSearchData, CadData["options"]>(CadSearchFormComponent);
