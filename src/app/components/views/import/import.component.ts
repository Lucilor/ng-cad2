import {Component, OnInit} from "@angular/core";
import {splitCad} from "@src/app/cad-viewer";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {NgxUiLoaderService} from "ngx-ui-loader";

@Component({
    selector: "app-import",
    templateUrl: "./import.component.html",
    styleUrls: ["./import.component.scss"]
})
export class ImportComponent implements OnInit {
    loaderId = "importLoader";
    loaderText = "";
    msg = "";
    force = false;

    constructor(private message: MessageService, private loader: NgxUiLoaderService, private dataService: CadDataService) {}

    ngOnInit() {
        document.title = "导入CAD";
    }

    async importDxf(event: Event) {
        if (this.force) {
            if (!(await this.message.confirm("重复数据将会被覆盖, 是否继续?"))) {
                return;
            }
        }
        const el = event.target as HTMLInputElement;
        if (el.files?.length) {
            this.loader.startLoader(this.loaderId);
            this.loaderText = "正在读取文件";
            this.dataService.silent = true;
            const data = await this.dataService.uploadDxf(el.files[0]);
            if (!data) {
                this.message.alert("读取文件失败");
                return;
            }
            const cads = splitCad(data);
            this.loaderText = `正在导入dxf数据(0/${cads.length})`;
            const skipped = [];
            const total = cads.length;
            const now = new Date().getTime();
            for (let i = 0; i < total; i++) {
                const result = await this.dataService.setCad({
                    collection: "cad",
                    cadData: cads[i],
                    force: this.force,
                    time: now
                });
                let text = `正在导入dxf数据(${i + 1}/${total})`;
                if (!result) {
                    skipped.push(cads[i].name);
                    text += `\n ${skipped.join(", ")} 被跳过`;
                }
                this.loaderText = text;
            }
            this.loader.stopLoader(this.loaderId);
            this.msg = `导入结束, ${total - skipped.length}个成功(共${total}个)`;
        }
        el.value = "";
    }
}
