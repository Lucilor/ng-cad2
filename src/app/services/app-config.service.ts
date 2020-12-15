import {Injectable} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {CadCollection, session} from "../app.common";
import {CadViewerConfig} from "../cad-viewer/cad-viewer";

export interface AppConfig extends CadViewerConfig {
    showCadGongshis: boolean;
    infoTabIndex: number;
    cadIds: string[];
    collection: CadCollection;
}

@Injectable({
    providedIn: "root"
})
export class AppConfigService {
    private config$: BehaviorSubject<AppConfig>;
    configChange$: BehaviorSubject<{oldVal: AppConfig; newVal: Partial<AppConfig>}>;

    get sessionConfig() {
        return (session.load("config") || {}) as Partial<AppConfig>;
    }

    constructor() {
        let defaultConfig: AppConfig = {
            width: innerWidth,
            height: innerHeight,
            backgroundColor: "black",
            reverseSimilarColor: true,
            validateLines: false,
            padding: [0],
            dragAxis: "xy",
            selectMode: "multiple",
            entityDraggable: true,
            hideDimensions: false,
            lineGongshi: 8,
            hideLineLength: false,
            hideLineGongshi: false,
            minLinewidth: 2,
            fontFamily: "微软雅黑",
            fontWeight: "normal",
            enableZoom: true,
            renderStep: 10000,
            showCadGongshis: true,
            infoTabIndex: 0,
            cadIds: [],
            collection: "cad"
        };
        const sessionConfig = this.sessionConfig;
        delete sessionConfig.width;
        delete sessionConfig.height;
        defaultConfig = {...defaultConfig, ...sessionConfig};
        this.config$ = new BehaviorSubject(defaultConfig);
        this.configChange$ = new BehaviorSubject({oldVal: defaultConfig, newVal: defaultConfig as Partial<AppConfig>});
        this.config$.subscribe((config) => session.save("config", config));
        window.addEventListener("unload", () => session.save("config", this.config()));
    }

    config(): AppConfig;
    config<T extends keyof AppConfig>(key: T): AppConfig[T];
    config(config: Partial<AppConfig>): void;
    config<T extends keyof AppConfig>(key: T, value: AppConfig[T]): void;
    config<T extends keyof AppConfig>(key?: T | Partial<AppConfig>, value?: AppConfig[T]) {
        const oldVal = this.config$.getValue();
        if (typeof key === "string") {
            if (value !== undefined) {
                const newVal: Partial<AppConfig> = {};
                newVal[key] = value;
                this.configChange$.next({oldVal, newVal});
                this.config$.next({...oldVal, ...newVal});
                return;
            } else {
                return this.config$.getValue()[key];
            }
        } else if (typeof key === "object") {
            this.configChange$.next({oldVal, newVal: key});
            this.config$.next({...oldVal, ...key});
            return;
        } else {
            return this.config$.getValue();
        }
    }
}
