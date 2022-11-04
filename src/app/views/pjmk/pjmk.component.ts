import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openJsonEditorDialog} from "@components/dialogs/json-editor/json-editor.component";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {exportZixuanpeijian, importZixuanpeijian, ZixuanpeijianOutput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {setGlobal} from "@src/app/app.common";

@Component({
    selector: "app-pjmk",
    templateUrl: "./pjmk.component.html",
    styleUrls: ["./pjmk.component.scss"]
})
export class PjmkComponent implements OnInit {
    table = "";
    tableName = "";
    id = "";
    name = "";
    data: ZixuanpeijianOutput = importZixuanpeijian();

    constructor(
        private dialog: MatDialog,
        private dataService: CadDataService,
        private route: ActivatedRoute,
        private message: MessageService
    ) {}

    async ngOnInit() {
        setGlobal("pjmk", this);
        await this.fetch();
        this.openDialog();
    }

    async fetch() {
        const {table, id} = this.route.snapshot.queryParams;
        if (id) {
            this.id = id;
        } else {
            this.message.error("缺少参数: id");
            return;
        }
        if (table) {
            this.table = table;
        } else {
            this.message.error("缺少参数: table");
            return;
        }
        const records = await this.dataService.queryMySql({table, filter: {where: {vid: id}}, fields: ["mingzi", "peijianmokuai"]});
        if (records?.length > 0) {
            this.name = records[0].mingzi || "";
            try {
                this.data = importZixuanpeijian(JSON.parse(records[0].peijianmokuai));
            } catch (error) {}
        }
        const structResponse = await this.dataService.post<any>("jichu/jichu/getXiaodaohangStructure", {id: table});
        if (structResponse?.data) {
            this.tableName = structResponse.data.mingzi || "";
        }
        document.title = `${this.tableName}配件模块 - ${this.name}`;
    }

    async openDialog() {
        const result = await openZixuanpeijianDialog(this.dialog, {
            data: {step: 1, stepFixed: true, checkEmpty: true, data: this.data, 可替换模块: true}
        });
        if (result) {
            this.data = result;
            await this.submit();
        }
    }

    async editTestData() {
        const result = await openJsonEditorDialog(this.dialog, {data: {json: this.data.测试数据}});
        if (result) {
            this.data.测试数据 = result;
            await this.submit();
        }
    }

    async submit() {
        const {table, id, data} = this;
        await this.dataService.post<void>("ngcad/setTableZixuanpeijian", {table, id, data: exportZixuanpeijian(data)});
    }
}
