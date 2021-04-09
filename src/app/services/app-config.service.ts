import {Injectable} from "@angular/core";
import {cloneDeep} from "lodash";
import {BehaviorSubject} from "rxjs";
import {CadViewerConfig} from "../cad-viewer/cad-viewer";
import {CadDataService} from "../modules/http/services/cad-data.service";

export interface AppConfig extends CadViewerConfig {
    showCadGongshis: boolean;
    infoTabIndex: number;
    leftMenuWidth: number;
    rightMenuWidth: number;
}

@Injectable({
    providedIn: "root"
})
export class AppConfigService {
    private config$ = new BehaviorSubject<AppConfig>({
        width: innerWidth,
        height: innerHeight,
        backgroundColor: "black",
        reverseSimilarColor: true,
        validateLines: false,
        padding: [0],
        dragAxis: "xy",
        selectMode: "multiple",
        entityDraggable: ["MTEXT", "DIMENSION"],
        hideDimensions: false,
        lineGongshi: 8,
        hideLineLength: false,
        hideLineGongshi: false,
        minLinewidth: 2,
        fontFamily: "微软雅黑",
        fontWeight: "normal",
        enableZoom: true,
        showCadGongshis: true,
        infoTabIndex: 0,
        leftMenuWidth: 200,
        rightMenuWidth: 300
    });
    configChange$ = new BehaviorSubject<{oldVal: AppConfig; newVal: Partial<AppConfig>}>({
        oldVal: this.config$.value,
        newVal: {}
    });
    userConfig: Partial<AppConfig> = {};

    constructor(private dataService: CadDataService) {
        const setConfigInterval = 1000;
        let id = -1;
        let config: Partial<AppConfig> = {};
        this.configChange$.subscribe(({newVal}) => {
            if (Object.keys(newVal).length) {
                window.clearInterval(id);
                config = {...config, ...newVal};
                id = window.setTimeout(() => {
                    this.setUserConfig(config);
                    config = {};
                }, setConfigInterval);
            }
        });
    }

    config(): AppConfig;
    config<T extends keyof AppConfig>(key: T): AppConfig[T];
    config(config: Partial<AppConfig>): void;
    config<T extends keyof AppConfig>(key: T, value: AppConfig[T]): void;
    config<T extends keyof AppConfig>(key?: T | Partial<AppConfig>, value?: AppConfig[T]) {
        const oldVal = this.config$.value;
        if (typeof key === "string") {
            if (value !== undefined) {
                const newVal: Partial<AppConfig> = {};
                newVal[key] = value;
                this.configChange$.next({oldVal, newVal});
                this.config$.next({...oldVal, ...newVal});
                return;
            } else {
                return this.config$.value[key];
            }
        } else if (typeof key === "object") {
            this.configChange$.next({oldVal, newVal: key});
            this.config$.next({...oldVal, ...key});
            return;
        } else {
            return this.config$.value;
        }
    }

    private purgeUserConfig(config: Partial<AppConfig>) {
        config = cloneDeep(config);
        delete config.width;
        delete config.height;
        delete config.padding;
        delete config.dragAxis;
        return config;
    }

    async getUserConfig(key?: string) {
        const response = await this.dataService.post<Partial<AppConfig>>("ngcad/getUserConfig", {key}, false);
        const config = response?.data;
        if (config) {
            this.userConfig = this.purgeUserConfig(config);
            if (Object.keys(this.userConfig).length) {
                this.config$.next({...this.config$.value, ...this.userConfig});
            }
        }
        return this.userConfig;
    }

    async setUserConfig(config: Partial<AppConfig>) {
        config = this.purgeUserConfig(config);
        if (Object.keys(config).length) {
            const response = await this.dataService.post("ngcad/setUserConfig", {config: this.purgeUserConfig(config)}, false);
            return response && response.code === 0;
        }
        return false;
    }
}
