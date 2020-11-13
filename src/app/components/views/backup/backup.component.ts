import {AfterViewInit, Component} from "@angular/core";
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
export class BackupComponent implements AfterViewInit {
    data: {id: number; title: string; cads: {data: CadData; img: string; checked: boolean}[]}[] = [];
    loaderId = "backupLoader";
    loaderText = "";

    constructor(
        private message: MessageService,
        private loader: NgxUiLoaderService,
        private dataService: CadDataService,
        private sanitizer: DomSanitizer
    ) {}

    async ngAfterViewInit() {
        document.title = "恢复备份";
        const result = await this.dataService.getBackupCads();
        if (!result) {
            this.message.alert("获取数据失败");
            return;
        }
        this.data = result
            .sort((a, b) => b.time - a.time)
            .map((v) => {
                const result: BackupComponent["data"][0] = {id: v.time, title: new Date(v.time).toLocaleString(), cads: []};
                v.cads
                    .sort((a, b) => (a.name > b.name ? 1 : -1))
                    .forEach(async (data) => {
                        const img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(data, 200, 100)) as string;
                        result.cads.push({img, data, checked: false});
                    });
                return result;
            });
    }

    async restore(i: number) {
        if (!(i >= 0)) {
            return;
        }
        const cads = this.data[i].cads.map((v) => v.data);
        const total = cads.length;
        this.loaderText = `正在恢复备份(0/${total})`;
        this.loader.startLoader(this.loaderId);
        for (let i = 0; i < total; i++) {
            await this.dataService.setCad({collection: "cad", cadData: cads[i], force: true});
            this.loaderText = `正在恢复备份(${i + 1}/${total})`;
        }
        this.loader.stopLoader(this.loaderId);
    }

    async remove(i: number) {
        if (await this.message.confirm("删除后无法恢复, 是否继续?")) {
            this.loaderText = "正在删除备份";
            this.loader.startLoader(this.loaderId);
            const result = await this.dataService.removeBackup(this.data[i].id);
            this.loader.stopLoader(this.loaderId);
            if (result) {
                this.data.splice(i, 1);
            }
        }
    }
}
