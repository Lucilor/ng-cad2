import {Injectable} from "@angular/core";
import {clamp, difference} from "lodash";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {BehaviorSubject, Subject} from "rxjs";
import {CadCollection} from "../app.common";
import {CadData} from "../cad-viewer/cad-data/cad-data";
import {generateLineTexts, PointsMap, validateLines, ValidateResult} from "../cad-viewer/cad-data/cad-lines";
import {CadViewer} from "../cad-viewer/cad-viewer";
import {setCadData, addCadGongshi} from "../cad.utils";
import {timeout} from "../utils";
import {ObjectOf} from "../utils/types";
import {AppConfig, AppConfigService} from "./app-config.service";

export type CadStatusNameMap = {
    normal: "普通";
    selectBaseline: "选择基准线";
    selectJointpoint: "选择连接点";
    assemble: "装配";
    split: "选取CAD";
    drawLine: "画线";
    editDimension: "编辑标注";
};

export const cadStatusNameMap: CadStatusNameMap = {
    normal: "普通",
    selectBaseline: "选择基准线",
    selectJointpoint: "选择连接点",
    assemble: "装配",
    split: "选取CAD",
    drawLine: "画线",
    editDimension: "编辑标注"
};

export interface CadStatus {
    name: keyof CadStatusNameMap;
    index: number;
    extra: ObjectOf<any>;
}

export interface SelectedCads {
    cads: string[];
    partners: string[];
    components: string[];
    fullCads: string[];
}

export type SelectedCadType = "cads" | "partners" | "components";

export interface Loader {
    id: string;
    start: boolean;
    text?: string;
}

export type CadPoints = {x: number; y: number; active: boolean}[];

@Injectable({
    providedIn: "root"
})
export class AppStatusService {
    selectedCads$ = new BehaviorSubject<SelectedCads>({
        cads: [],
        partners: [],
        components: [],
        fullCads: []
    });
    disabledCadTypes$ = new BehaviorSubject<SelectedCadType[]>([]);
    cadStatus$ = new BehaviorSubject<CadStatus>({
        name: "normal",
        index: -1,
        extra: {}
    });
    cad = new CadViewer();
    loaderId$ = new BehaviorSubject<string>("master");
    loaderText$ = new BehaviorSubject<string>("");
    openCad$ = new Subject();
    cadPoints$ = new BehaviorSubject<CadPoints>([]);

    constructor(private config: AppConfigService, private loaderService: NgxUiLoaderService) {
        this.config.configChange$.subscribe(({newVal}) => {
            const cad = this.cad;
            cad.config(newVal);
            const showCadGongshis = !!newVal.showCadGongshis;
            const cadGongshis = cad.data.getAllEntities().mtext.filter((e) => e.info.isCadGongshi);
            cadGongshis.forEach((e) => (e.visible = showCadGongshis));
            cad.render(cadGongshis);
        });
    }

    clearSelectedCads() {
        this.selectedCads$.next({cads: [], partners: [], components: [], fullCads: []});
    }

    refreshSelectedCads() {
        this.selectedCads$.next(this.selectedCads$.getValue());
    }

    getFlatSelectedCads() {
        const currCads = this.selectedCads$.getValue();
        const data = this.cad.data;
        const {partners, components, fullCads} = currCads;
        const fullCadsData = data.findChildren(fullCads);
        let childrenIds: string[] = [];
        fullCadsData.forEach((v) => {
            childrenIds = childrenIds.concat(v.partners.map((vv) => vv.id));
            childrenIds = childrenIds.concat(v.components.data.map((vv) => vv.id));
        });
        const ids = [...fullCads, ...difference([...partners, ...components], childrenIds)];
        return data.findChildren(ids);
    }

    cadStatus(): CadStatus;
    cadStatus<T extends keyof CadStatus>(key: T): CadStatus[T];
    cadStatus(config: Partial<CadStatus>): void;
    cadStatus<T extends keyof CadStatus>(key: T, value: CadStatus[T]): void;
    cadStatus<T extends keyof CadStatus>(key?: T | Partial<CadStatus>, value?: CadStatus[T]) {
        if (typeof key === "string") {
            if (value !== undefined) {
                const obj: Partial<CadStatus> = {};
                obj[key] = value;
                this.cadStatus$.next({...this.cadStatus$.getValue(), ...obj});
                return;
            } else {
                return this.cadStatus$.getValue()[key];
            }
        } else if (typeof key === "object") {
            this.cadStatus$.next({...this.cadStatus$.getValue(), ...key});
            return;
        } else {
            return this.cadStatus$.getValue();
        }
    }

    async openCad(data?: CadData[], collection?: CadCollection) {
        const cad = this.cad;
        if (!collection) {
            collection = this.config.config("collection");
        }
        if (data) {
            cad.data.components.data = data;
            this.clearSelectedCads();
        } else {
            data = cad.data.components.data;
            this.refreshSelectedCads();
        }
        const config: Partial<AppConfig> = {};
        const sessionConfig = this.config.sessionConfig;
        config.cadIds = data.map((v) => v.id);
        cad.data.info.算料单 = data.some((v) => v.info.算料单);
        if (typeof sessionConfig.hideLineGongshi === "boolean") {
            config.hideLineGongshi = sessionConfig.hideLineGongshi;
        } else {
            config.hideLineGongshi = !!cad.data.info.算料单;
        }
        if (typeof sessionConfig.hideLineLength === "boolean") {
            config.hideLineLength = sessionConfig.hideLineLength;
        } else {
            config.hideLineLength = collection !== "cad";
        }
        data.forEach((v) => {
            setCadData(v);
            addCadGongshi(v, this.config.config("showCadGongshis"), collection === "CADmuban");
        });
        if (collection === "cad") {
            data.forEach((v) => validateLines(v));
        }
        this.config.config(config);
        this.generateLineTexts();
        cad.data.updatePartners().updateComponents();
        cad.reset();
        cad.center();
        await cad.render();
        cad.center();
        this.openCad$.next();
    }

    startLoader(config: {id?: string; text?: string} = {}) {
        const {id, text} = config;
        if (typeof id === "string") {
            this.loaderId$.next(id);
        }
        if (typeof text === "string") {
            this.loaderText$.next(text);
        }
        this.loaderService.startLoader(this.loaderId$.getValue());
    }

    stopLoader() {
        this.loaderService.stopLoader(this.loaderId$.getValue());
        this.loaderId$.next("master");
        this.loaderText$.next("");
    }

    generateLineTexts() {
        if (this.config.config("collection") === "CADmuban") {
            this.cad.data.components.data.forEach((v) => {
                v.entities.line.forEach((e) => {
                    e.children.mtext = e.children.mtext.filter((mt) => !mt.info.isLengthText && !mt.info.isGongshiText);
                });
                v.components.data.forEach((vv) => generateLineTexts(vv));
            });
        } else {
            this.cad.data.components.data.forEach((v) => generateLineTexts(v));
        }
    }

    async setCadPoints(map: PointsMap) {
        const points: CadPoints = map.map((v) => {
            const {x, y} = this.cad.getScreenPoint(v.point.x, v.point.y);
            return {x, y, active: false};
        });
        await timeout(0);
        this.cadPoints$.next(points);
    }

    addCadPoint(point: CadPoints[0], i?: number) {
        const points = this.cadPoints$.getValue();
        if (typeof i !== "number") {
            i = points.length;
        }
        points.splice(i, 0, point);
        this.cadPoints$.next(points);
    }

    removeCadPoint(i: number) {
        const points = this.cadPoints$.getValue();
        i = clamp(i, 0, points.length - 1);
        points.splice(i, 1);
        this.cadPoints$.next(points);
    }

    validate() {
        const results: ValidateResult[] = [];
        this.cad.data.components.data.forEach((v) => {
            results.push(validateLines(v));
        });
        this.cad.render();
        return results;
    }
}
