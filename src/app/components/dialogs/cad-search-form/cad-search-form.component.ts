import {Component, OnInit} from "@angular/core";
import {MatDialogRef, MatDialogConfig, MatDialog} from "@angular/material/dialog";
import {CadOption} from "@src/app/cad-viewer";
import {CadSearchData, CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {timeout} from "@src/app/utils";

@Component({
    selector: "app-cad-search-form",
    templateUrl: "./cad-search-form.component.html",
    styleUrls: ["./cad-search-form.component.scss"]
})
export class CadSearchFormComponent implements OnInit {
    data: CadSearchData = [];
    form: {[key: string]: string[]} = {};
    additional: CadSearchData[0] = {title: "自由选择", items: []};

    constructor(
        public dialogRef: MatDialogRef<CadSearchFormComponent, CadOption[]>,
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
        const name = (await this.message.prompt({placeholder: "请输入选项名字"})) as string;
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
        const result = Array<CadOption>();
        for (const name in this.form) {
            if (this.form[name].length) {
                const value = this.form[name].join(",");
                result.push({name, value});
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

export function openCadSearchFormDialog(dialog: MatDialog, config: MatDialogConfig<CadSearchData>) {
    return dialog.open<CadSearchFormComponent, CadSearchData, CadOption[]>(CadSearchFormComponent, config);
}
