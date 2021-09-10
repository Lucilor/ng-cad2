import {Component, OnInit} from "@angular/core";
import {session} from "@app/app.common";
import {CadData, splitCad} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf} from "@utils";
import {difference} from "lodash";
import md5 from "md5";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {environment} from "src/environments/environment";

export interface ImportComponentCad {
    data: CadData;
    errors: string[];
}

type ProgressBarStatus = "hidden" | "progress" | "success" | "error";

@Component({
    selector: "app-import",
    templateUrl: "./import.component.html",
    styleUrls: ["./import.component.scss"]
})
export class ImportComponent implements OnInit {
    private _cadsKey = "import-cads";
    private _cadNameRegex = /^(?!\d)[\da-zA-Z\u4e00-\u9fa5_]*$/u;

    loaderId = "importLoader";
    msg = "test...";
    cads: ImportComponentCad[] = [];
    cadsParsed = false;
    hasError = false;
    optionsCache: ObjectOf<string[]> = {};
    progress = 0;
    progressBarStatus: ProgressBarStatus = "hidden";

    constructor(private message: MessageService, private loader: NgxUiLoaderService, private dataService: CadDataService) {}

    ngOnInit() {
        const cads: ImportComponentCad[] | null = session.load<any[]>(this._cadsKey);
        if (cads && !environment.production) {
            this.cads = cads.map((v) => ({...v, data: new CadData(v.data)}));
        }
    }

    async importDxf(event: Event) {
        const el = event.target as HTMLInputElement;
        if (el.files?.length) {
            this.progress = 0;
            this.progressBarStatus = "progress";
            this.msg = "正在获取数据";
            this.loader.startLoader(this.loaderId);
            this.dataService.silent = true;
            const data = await this.dataService.uploadDxf(el.files[0]);
            if (!data) {
                this.message.alert("读取文件失败");
                return;
            }
            const cads = splitCad(data);
            const total = cads.length;
            this.msg = "正在检查数据";
            await this.parseCads(cads);
            this.progress = (1 / (total + 1)) * 100;
            if (this.hasError) {
                this.msg = "数据有误";
                this.progressBarStatus = "error";
            } else {
                const skipped = [];
                const silent = this.dataService.silent;
                this.dataService.silent = true;
                for (let i = 0; i < total; i++) {
                    const result = await this.dataService.setCad({
                        collection: "cad",
                        cadData: cads[i],
                        force: true
                    });
                    this.msg = `正在导入dxf数据(${i + 1}/${total})`;
                    if (!result) {
                        skipped.push(cads[i].name);
                        this.msg += `\n ${skipped.join(", ")} 保存失败`;
                        this.cads[i].errors.push("保存失败");
                    }
                    this.progress = ((i + 2) / (total + 1)) * 100;
                }
                this.dataService.silent = silent;
                this.loader.stopLoader(this.loaderId);
                this.msg = `导入结束, ${total - skipped.length}个成功(共${total}个)`;
                this.progressBarStatus = "success";
            }
            this.loader.stopLoader(this.loaderId);
        }
        el.value = "";
    }

    private _getMd5(cad: CadData) {
        const options: [string, string[]][] = [];
        const optionKeys = Object.keys(cad.options).sort();
        optionKeys.forEach((key) => {
            options.push([key, cad.options[key].split(";").sort()]);
        });
        return md5(
            JSON.stringify({
                name: cad.name,
                type: cad.type,
                type2: cad.type2,
                conditions: cad.conditions.sort(),
                options
            })
        );
    }

    async parseCads(cads: CadData[]) {
        this.cadsParsed = false;
        this.hasError = false;
        const uniqCodesCount: ObjectOf<number> = {};
        cads.forEach((v) => {
            const uniqCode = v.info.唯一码;
            if (!uniqCode) {
                return;
            }
            if (uniqCodesCount[uniqCode] === undefined) {
                uniqCodesCount[uniqCode] = 1;
            } else {
                uniqCodesCount[uniqCode]++;
            }
        });

        this.cads = [];
        const md5Map: ObjectOf<ImportComponentCad[]> = {};
        for (const cad of cads) {
            const item: ImportComponent["cads"][0] = {
                data: cad,
                errors: []
            };

            const uniqId = cad.info.唯一码;
            if (!uniqId) {
                item.errors.push("没有唯一码");
            } else if (uniqCodesCount[uniqId] > 1) {
                item.errors.push("唯一码重复: " + uniqId);
            }
            if (cad.name.match(/^\d+/)) {
                cad.name = "_" + cad.name;
            } else if (!cad.name.match(this._cadNameRegex)) {
                item.errors.push("CAD名字只能是：中文、英文字母、数字、下划线");
            }
            if (cad.info.修改包边正面宽规则 && !cad.options["包边"]) {
                item.errors.push("没有[包边选项]时不能有[修改包边正面宽规则]");
            }
            if (cad.info.锁边自动绑定可搭配铰边 &&cad.type !== "锁企料") {
                item.errors.push("分类不为[锁企料]时不能有[锁边自动绑定可搭配铰边]");
            }
            for (const optionKey in cad.options) {
                if (["铰边", "锁边"].includes(optionKey)) {
                    continue;
                }
                const optionValues = cad.options[optionKey].split(";");
                if (this.optionsCache[optionKey] === undefined) {
                    const optionInfo = await this.dataService.getOptions(optionKey, "");
                    this.optionsCache[optionKey] = optionInfo.data.map((v) => v.name);
                }
                const optionsNotExist = difference(optionValues, this.optionsCache[optionKey]);
                if (optionsNotExist.length > 0) {
                    item.errors.push(`选项[${optionKey}]不存在: ${optionsNotExist.join(", ")}`);
                }
            }
            if (item.errors.length > 0) {
                this.hasError = true;
            }

            this.cads.push(item);
            const md5Str = this._getMd5(cad);
            if (md5Map[md5Str]) {
                md5Map[md5Str].push(item);
            } else {
                md5Map[md5Str] = [item];
            }
        }
        for (const md5Str in md5Map) {
            if (md5Map[md5Str].length > 1) {
                this.hasError = true;
                const uniCodes = md5Map[md5Str].map((v) => v.data.info.唯一码);
                md5Map[md5Str].forEach((cad) => {
                    cad.errors.push(`数据重复: ${uniCodes.filter((v) => v !== cad.data.info.唯一码).join(", ")}`);
                });
            }
        }

        session.save(
            this._cadsKey,
            this.cads.map((v) => ({...v, data: environment.production ? null : v.data.export()}))
        );
        this.cadsParsed = true;
    }
}
