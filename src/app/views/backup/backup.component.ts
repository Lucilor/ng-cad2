import {Component} from "@angular/core";
import {DomSanitizer} from "@angular/platform-browser";
import {CadData} from "@src/app/cad-viewer";
import {getCadPreview} from "@src/app/cad.utils";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {NgxUiLoaderService} from "ngx-ui-loader";

@Component({
    selector: "app-backup",
    templateUrl: "./backup.component.html",
    styleUrls: ["./backup.component.scss"]
})
export class BackupComponent {
    data: {time: number; title: string; data: CadData; img: string}[] = [];
    loaderId = "backupLoader";
    loaderText = "";
    search = "";
    limit = 20;

    constructor(
        private message: MessageService,
        private loader: NgxUiLoaderService,
        private dataService: CadDataService,
        private sanitizer: DomSanitizer
    ) {
        this.getData();
    }

    async getData() {
        this.loaderText = "正在获取数据";
        this.loader.startLoader(this.loaderId);
        const result = await this.dataService.getBackupCads(this.search, this.limit);
        this.data = [];
        if (result) {
            for (const v of result) {
                const img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(v.data, {width: 200, height: 100})) as string;
                this.data.push({
                    time: v.time,
                    title: new Date(v.time).toLocaleString(),
                    img,
                    data: v.data
                });
            }
        } else {
            this.message.alert("获取数据失败");
        }
        this.loader.stopLoader(this.loaderId);
    }

    async restore(i: number) {
        if (!(i >= 0)) {
            return;
        }
        this.loaderText = `正在恢复备份`;
        this.loader.startLoader(this.loaderId);
        await this.dataService.setCad({collection: "cad", cadData: this.data[i].data, force: true});
        this.loader.stopLoader(this.loaderId);
    }

    async remove(i: number) {
        if (await this.message.confirm("删除后无法恢复, 是否继续?")) {
            this.loaderText = "正在删除备份";
            this.loader.startLoader(this.loaderId);
            const result = await this.dataService.removeBackup(this.data[i].data.name, this.data[i].time);
            this.loader.stopLoader(this.loaderId);
            if (result) {
                this.getData();
            }
        }
    }

    alertInfo(i: number) {
        const data = this.data[i].data;
        const getSpaces = (n: number) => new Array(n).fill("&nbsp;").join("");
        const optionsStr = Object.keys(data.options)
            .map((v) => `${getSpaces(9)}${v}: ${data.options[v]}`)
            .join("<br>");
        const conditionsStr = data.conditions.map((v) => `${getSpaces(9)}${v}`).join("<br>");
        const content = [`分类: ${data.type}`, "选项: ", optionsStr, "条件: ", conditionsStr].join("<br>");
        this.message.alert(content, data.name);
    }
}
