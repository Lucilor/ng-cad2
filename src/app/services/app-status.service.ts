import {Injectable} from "@angular/core";
import {ActivatedRoute, Router, Params} from "@angular/router";
import {CadCollection, local, timer} from "@app/app.common";
import {setCadData, prepareCadViewer, validateLines, ValidateResult, suanliaodanZoomIn, suanliaodanZoomOut} from "@app/cad.utils";
import {CadData, CadLine, CadViewer, CadMtext, generateLineTexts, PointsMap, CadEntities, generatePointsMap} from "@cad-viewer";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf, timeout} from "@utils";
import {difference, differenceWith, clamp} from "lodash";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {BehaviorSubject, Subject} from "rxjs";
import {AppConfigService, AppConfig} from "./app-config.service";
import {CadStatus, CadStatusNormal} from "./cad-status";

const 合型板示意图 = new CadData();
合型板示意图.entities.add(new CadLine({start: [0, 20], end: [0, -20]}));
合型板示意图.entities.add(new CadLine({start: [0, 20], end: [8, 20]}));
合型板示意图.entities.add(new CadLine({start: [0, -20], end: [8, -20]}));
合型板示意图.entities.add(new CadLine({start: [20, 0], end: [-20, 0]}));
合型板示意图.entities.add(new CadLine({start: [20, 0], end: [20, 8]}));
合型板示意图.entities.add(new CadLine({start: [-20, 0], end: [-20, 8]}));
合型板示意图.entities.add(new CadLine({start: [20, 0], end: [20, 8]}));
const replaceMap: ObjectOf<CadData> = {合型板示意图};

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

export type CadPoints = {x: number; y: number; active: boolean; lines: string[]}[];

@Injectable({
    providedIn: "root"
})
export class AppStatusService {
    collection$ = new BehaviorSubject<CadCollection>("cad");
    selectedCads$ = new BehaviorSubject<SelectedCads>({
        cads: [],
        partners: [],
        components: [],
        fullCads: []
    });
    disabledCadTypes$ = new BehaviorSubject<SelectedCadType[]>([]);
    cadStatus: CadStatus = new CadStatusNormal();
    cadStatusEnter$ = new BehaviorSubject<CadStatus>(new CadStatusNormal());
    cadStatusExit$ = new BehaviorSubject<CadStatus>(new CadStatusNormal());
    cad = new CadViewer();
    loaderId$ = new BehaviorSubject<string>("master");
    loaderText$ = new BehaviorSubject<string>("");
    openCad$ = new Subject<void>();
    cadPoints$ = new BehaviorSubject<CadPoints>([]);
    project = "";
    setProject$ = new Subject<void>();
    isAdmin$ = new BehaviorSubject<boolean>(false);
    changelogTimeStamp$ = new BehaviorSubject<number>(-1);
    private _refreshTimeStamp = Number(local.load("refreshTimeStamp") || -1);

    constructor(
        private config: AppConfigService,
        private loaderService: NgxUiLoaderService,
        private route: ActivatedRoute,
        private router: Router,
        private dataService: CadDataService,
        private message: MessageService
    ) {
        this.cad.config(this.config.getConfig());
        this.config.configChange$.subscribe(({newVal}) => {
            const cad = this.cad;
            cad.config(newVal);
        });
    }

    private _replaceText(source: CadData, text: string, data: CadData) {
        const mtexts = source.getAllEntities().filter((e) => e instanceof CadMtext && e.text === text);
        mtexts.forEach((mtext) => {
            const insert = (mtext as CadMtext).insert;
            const entities = data.getAllEntities().clone();
            entities.transform({translate: insert.toArray()}, true);
            source.entities.merge(entities);
        });
        source.separate(new CadData({entities: mtexts.export()}));
    }

    async setProject(queryParams: Params) {
        const {project, action} = queryParams;
        if (project && project !== this.project) {
            this.project = project;
            this.dataService.baseURL = `${origin}/n/${project}/index/`;
            this.startLoader();
            if (!action) {
                const response = await this.dataService.get("user/user/isAdmin", {nothing: null});
                this.isAdmin$.next(!!response?.data);
                await this.config.getUserConfig();
            }
            let changelogTimeStamp = this.changelogTimeStamp$.value;
            if (changelogTimeStamp < 0) {
                const {changelog} = await this.dataService.getChangelog(1, 1);
                changelogTimeStamp = changelog[0]?.timeStamp || 0;
            }
            this.stopLoader();
            if (environment.production && changelogTimeStamp > this._refreshTimeStamp) {
                this.message.snack("版本更新，自动刷新页面");
                local.save("refreshTimeStamp", new Date().getTime());
                await timeout(1000);
                location.reload();
                return false;
            }
            this.changelogTimeStamp$.next(changelogTimeStamp);
            this.setProject$.next();
        }
        return true;
    }

    clearSelectedCads() {
        this.selectedCads$.next({cads: [], partners: [], components: [], fullCads: []});
    }

    refreshSelectedCads() {
        this.selectedCads$.next(this.selectedCads$.value);
    }

    getFlatSelectedCads() {
        const currCads = this.selectedCads$.value;
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

    setCadStatus(value: CadStatus, confirmed = false) {
        this.cadStatus.confirmed = confirmed;
        this.cadStatusExit$.next(this.cadStatus);
        this.cadStatus = value;
        this.cadStatusEnter$.next(value);
    }

    toggleCadStatus(cadStatus: CadStatus) {
        const {name, index} = this.cadStatus;
        if (name === cadStatus.name && index === cadStatus.index) {
            this.setCadStatus(new CadStatusNormal());
        } else {
            this.setCadStatus(cadStatus);
        }
    }

    async openCad(data?: CadData[], collection?: CadCollection) {
        const timerName = "openCad";
        timer.start(timerName);
        const cad = this.cad;
        if (data) {
            cad.data.components.data = data;
        } else {
            data = cad.data.components.data;
        }
        const newConfig: Partial<AppConfig> = {};
        const ids = data.map((v) => v.id);
        if (collection && this.collection$.value !== collection) {
            this.collection$.next(collection);
        } else {
            collection = this.collection$.value;
        }
        if (collection === "CADmuban") {
            this.config.setConfig({hideLineLength: true, hideLineGongshi: true}, {sync: false});
        }

        const {ids: ids2, collection: collection2} = this.route.snapshot.queryParams;
        if (ids.join(",") !== ids2 || collection !== collection2) {
            this.router.navigate(["/index"], {queryParams: {id: undefined, ids: ids.join(","), collection}, queryParamsHandling: "merge"});
        }
        this.config.setUserConfig(newConfig);
        const title = data.map((v) => v.name || "(未命名)").join(",") || "未选择CAD";
        document.title = title;
        cad.data.name = title;
        await prepareCadViewer(cad);
        this.openCad$.next();
        await timeout(0);
        data.forEach((v) => {
            setCadData(v, this.project);
            for (const key in replaceMap) {
                this._replaceText(v, key, replaceMap[key]);
            }
            suanliaodanZoomIn(v);
            if (collection === "cad") {
                validateLines(v);
            }
        });
        this.generateLineTexts();
        // cad.data.updateComponents();
        cad.reset().render().center();
        timer.end(timerName, "打开CAD");
    }

    closeCad(data?: CadData[]) {
        if (!data) {
            data = this.cad.data.components.data;
        }
        return data.map((v) => {
            const v2 = v.clone();
            suanliaodanZoomOut(v2);
            return v2;
        });
    }

    startLoader(config: {id?: string; text?: string} = {}) {
        const {id, text} = config;
        if (typeof id === "string") {
            this.loaderId$.next(id);
        }
        if (typeof text === "string") {
            this.loaderText$.next(text);
        }
        this.loaderService.startLoader(this.loaderId$.value);
    }

    stopLoader() {
        this.loaderService.stopLoader(this.loaderId$.value);
        this.loaderId$.next("master");
        this.loaderText$.next("");
    }

    generateLineTexts() {
        if (this.collection$.value === "CADmuban") {
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

    getCadPoints(map?: PointsMap | CadEntities) {
        if (!map) {
            return [];
        }
        if (map instanceof CadEntities) {
            map = generatePointsMap(map);
        }
        return map.map((v) => {
            const {x, y} = this.cad.getScreenPoint(v.point.x, v.point.y);
            return {x, y, active: false, lines: v.lines.map((vv) => vv.id)} as CadPoints[0];
        });
    }

    setCadPoints(map: PointsMap | CadEntities = [], exclude: CadPoints = []) {
        this.cadPoints$.next(differenceWith(this.getCadPoints(map), exclude, (a, b) => a.x === b.x && a.y === b.y));
    }

    addCadPoint(point: CadPoints[0], i?: number) {
        const points = this.cadPoints$.value;
        if (typeof i !== "number") {
            i = points.length;
        }
        points.splice(i, 0, point);
        this.cadPoints$.next(points);
    }

    removeCadPoint(i: number) {
        const points = this.cadPoints$.value;
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
