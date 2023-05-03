import {Injectable} from "@angular/core";
import {local} from "@app/app.common";
import {CadViewerConfig} from "@cad-viewer";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {ObjectOf, keysOf} from "@utils";
import {cloneDeep, isEqual} from "lodash";
import {BehaviorSubject} from "rxjs";

export interface AppConfig extends CadViewerConfig {
  infoTabIndex: number;
  leftMenuWidth: number;
  rightMenuWidth: number;
  scroll: ObjectOf<number>;
  subCadsMultiSelect: boolean;
  pointSize: number;
  cadPointsAnywhere: boolean;
}

export interface AppConfigChange {
  oldVal: Partial<AppConfig>;
  newVal: Partial<AppConfig>;
  sync: boolean;
  isUserConfig: boolean;
}

export type AppConfigChangeOptions = Partial<Omit<AppConfigChange, "oldVal" | "newVal">>;

@Injectable({
  providedIn: "root"
})
export class AppConfigService {
  private config$: BehaviorSubject<AppConfig>;
  configChange$: BehaviorSubject<AppConfigChange>;
  private _userConfig: Partial<AppConfig> = {};
  private _configKeys: (keyof AppConfig)[];
  noUser = false;

  constructor(private dataService: CadDataService) {
    const defaultConfig: AppConfig = {
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
      fontStyle: {family: "微软雅黑", weight: "normal"},
      dimStyle: {},
      enableZoom: true,
      dashedLinePadding: 2,
      // 分界线
      infoTabIndex: 0,
      leftMenuWidth: 200,
      rightMenuWidth: 300,
      scroll: {},
      subCadsMultiSelect: true,
      pointSize: 20,
      cadPointsAnywhere: false
    };
    this._configKeys = keysOf(defaultConfig);
    const localUserConfig = this._purgeUserConfig(local.load<Partial<AppConfig>>("userConfig") || {});
    for (const key of this._configKeys) {
      if (localUserConfig[key] !== undefined) {
        (defaultConfig[key] as any) = localUserConfig[key];
      }
    }
    this.config$ = new BehaviorSubject<AppConfig>(defaultConfig);
    this.configChange$ = new BehaviorSubject<AppConfigChange>({
      oldVal: {},
      newVal: this.config$.value,
      sync: false,
      isUserConfig: true
    });

    const setConfigInterval = 1000;
    let id = -1;
    let config: Partial<AppConfig> = {};
    this.configChange$.subscribe(({newVal, sync}) => {
      if (sync) {
        config = {...config, ...newVal};
        if (Object.keys(config).length) {
          window.clearInterval(id);
          id = window.setTimeout(() => {
            this.setUserConfig(config);
            config = {};
          }, setConfigInterval);
        }
      }
    });
  }

  private _purgeConfig(oldVal: Partial<AppConfig>, newVal: Partial<AppConfig>) {
    const oldVal2 = cloneDeep(oldVal);
    const newVal2 = cloneDeep(newVal);
    const keys = keysOf(oldVal).concat(keysOf(newVal));
    for (const key of keys) {
      if (!this._configKeys.includes(key)) {
        delete oldVal2[key];
        delete newVal2[key];
      } else if (oldVal2[key] === undefined) {
        (oldVal2 as any)[key] = this.getConfig(key);
      } else if (newVal2[key] === undefined || isEqual(oldVal2[key], newVal2[key])) {
        delete newVal2[key];
      }
    }
    return [oldVal2, newVal2];
  }

  private _purgeUserConfig(config: Partial<AppConfig>) {
    config = cloneDeep(config);
    delete config.width;
    delete config.height;
    delete config.padding;
    delete config.dragAxis;
    delete config.entityDraggable;
    if (typeof config.lineGongshi !== "number" || config.lineGongshi <= 0) {
      delete config.lineGongshi;
    }
    return config;
  }

  getConfig(): AppConfig;
  getConfig<T extends keyof AppConfig>(key: T): AppConfig[T];
  getConfig(key?: keyof AppConfig) {
    if (typeof key === "string") {
      return cloneDeep(this.config$.value[key]);
    } else {
      return cloneDeep({...this.config$.value});
    }
  }

  setConfig(config: Partial<AppConfig>, options?: AppConfigChangeOptions): Partial<AppConfig>;
  setConfig<T extends keyof AppConfig>(key: T, value: AppConfig[T], options?: AppConfigChangeOptions): Partial<AppConfig>;
  setConfig<T extends keyof AppConfig>(
    key: T | Partial<AppConfig>,
    value?: AppConfig[T] | AppConfigChangeOptions,
    options?: AppConfigChangeOptions
  ) {
    const oldVal = this.config$.value;
    let newVal: Partial<AppConfig> | undefined;
    if (typeof key === "string") {
      newVal = {};
      newVal[key] = value as AppConfig[T];
    } else {
      newVal = key;
      options = value as AppConfigChangeOptions;
    }
    const [oldVal2, newVal2] = this._purgeConfig(oldVal, newVal);
    const sync = options?.sync ?? true;
    const isUserConfig = options?.isUserConfig ?? false;
    this.configChange$.next({oldVal: oldVal2, newVal: newVal2, sync, isUserConfig});
    this.config$.next({...oldVal, ...newVal2});
    return oldVal2;
  }

  async getUserConfig(key?: string) {
    if (this.noUser) {
      return {};
    }
    const response = await this.dataService.post<Partial<AppConfig>>("ngcad/getUserConfig", {key});
    const config = this.dataService.getResponseData(response);
    if (config) {
      this._userConfig = this._purgeUserConfig(config);
      if (Object.keys(this._userConfig).length) {
        this.setConfig(this._userConfig, {sync: false, isUserConfig: true});
        local.save("userConfig", {...(local.load<Partial<AppConfig>>("userConfig") || {}), ...this._userConfig});
      }
    }
    return this._userConfig;
  }

  async setUserConfig(config: Partial<AppConfig>) {
    if (this.noUser) {
      return false;
    }
    config = this._purgeUserConfig(config);
    if (Object.keys(config).length) {
      const response = await this.dataService.post("ngcad/setUserConfig", {config: this._purgeUserConfig(config)});
      local.save("userConfig", {...(local.load<Partial<AppConfig>>("userConfig") || {}), ...config});
      return response && response.code === 0;
    }
    return false;
  }
}
