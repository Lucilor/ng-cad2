import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {ZixuanpeijianOutput} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";

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
    data: ZixuanpeijianOutput = {模块: [], 零散: []};

    constructor(
        private dialog: MatDialog,
        private dataService: CadDataService,
        private route: ActivatedRoute,
        private message: MessageService
    ) {}

    async ngOnInit() {
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
        const records = await this.dataService.queryMySql({table, filter: {id}, fields: ["mingzi"]});
        if (records?.length > 0) {
            this.name = records[0].mingzi || "";
        }
        const structResponse = await this.dataService.post<any>("jichu/jichu/getXiaodaohangStructure", {id: table});
        if (structResponse?.data) {
            this.tableName = structResponse.data.mingzi || "";
        }
        document.title = `${this.tableName}配件模块 - ${this.name}`;
        await this.fetch();
        this.openDialog();
    }

    async fetch() {
        const {table, id} = this;
        const response = await this.dataService.post<ZixuanpeijianOutput>("ngcad/getTableZixuanpeijian", {table, id});
        if (response?.data) {
            this.data = response.data;
        }
    }

    async openDialog() {
        const result = await openZixuanpeijianDialog(this.dialog, {
            data: {step: 1, stepFixed: true, checkEmpty: true, data: this.data}
        });
        if (result) {
            this.data = result;
            const {table, id, data} = this;
            await this.dataService.post<void>("ngcad/setTableZixuanpeijian", {table, id, data});
        }
    }
}
