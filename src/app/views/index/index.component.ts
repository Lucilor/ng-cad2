import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadData} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {GetCadParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService} from "@services/app-config.service";
import {AppStatusService, OpenCadOptions} from "@services/app-status.service";
import {environment} from "@src/environments/environment";
import {log} from "@utils";

@Component({
    selector: "app-index",
    templateUrl: "./index.component.html",
    styleUrls: ["./index.component.scss"]
})
export class IndexComponent implements OnInit {
    params?: OpenCadOptions;

    constructor(
        private config: AppConfigService,
        private status: AppStatusService,
        private dataService: CadDataService,
        private route: ActivatedRoute,
        private message: MessageService
    ) {}

    async ngOnInit() {
        let cachedData: any = null;
        let params: any = null;
        try {
            cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data") || "null");
            params = JSON.parse(sessionStorage.getItem("params") || "{}");
        } catch (error) {
            console.warn(error);
        }
        if (cachedData) {
            if (Array.isArray(cachedData)) {
                cachedData = cachedData[0];
            }
            this.params = {
                data: new CadData(cachedData),
                collection: params.collection || "cad"
            };
        } else {
            const {id, ids, collection, errorMessage} = this.route.snapshot.queryParams;
            if (errorMessage) {
                this.message.alert(errorMessage);
            }
            if ((id || ids) && collection) {
                const getParams: GetCadParams = {collection, sync: true};
                if (id) {
                    getParams.id = id;
                }
                if (ids) {
                    getParams.ids = ids.split(",");
                }
                getParams.collection = collection;
                const result = await this.dataService.getCad(getParams);
                if (result.cads.length > 0) {
                    this.params = {data: result.cads[0], collection};
                }
            }
        }

        const cad = this.status.cad;
        const globalVars: {name: string; desc: string; attrs: PropertyDescriptor}[] = [
            {name: "cad", desc: "当前CAD实例", attrs: {get: () => cad}},
            {name: "getConfig", desc: "获取当前配置", attrs: {get: () => this.config.getConfig.bind(this.config)}},
            {name: "setConfig", desc: "设置当前配置", attrs: {get: () => this.config.setConfig.bind(this.config)}},
            {name: "data", desc: "CAD数据", attrs: {get: () => cad.data}},
            {name: "dataEx", desc: "CAD的导出数据", attrs: {get: () => cad.data.export()}},
            {name: "selected", desc: "当前选中的所有实体", attrs: {get: () => cad.selected()}},
            {name: "selected0", desc: "当前选中的第一个实体", attrs: {get: () => cad.selected().toArray()[0]}}
        ];
        if (!environment.production) {
            globalVars.push({name: "status", desc: "状态管理实例", attrs: {value: this.status}});
        }
        console.groupCollapsed("全局变量");
        const maxLen = globalVars.reduce((prev, curr) => Math.max(prev, curr.name.length), 0);
        globalVars.forEach((v) => {
            log(`${v.name.padEnd(maxLen, " ")} -- %c${v.desc}`, "", {fontStyle: "italic", paddingRight: "5px"});
            Reflect.defineProperty(window, v.name, {...v.attrs, configurable: true});
        });
        console.groupEnd();
    }
}
