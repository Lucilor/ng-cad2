import {Injectable} from "@angular/core";
import {ActivatedRoute, Router, Params} from "@angular/router";
import {CadCollection, local, ProjectConfig, timer} from "@app/app.common";
import {
    setCadData,
    prepareCadViewer,
    validateLines,
    ValidateResult,
    suanliaodanZoomIn,
    suanliaodanZoomOut,
    updateCadPreviewImg,
    getCadTotalLength
} from "@app/cad.utils";
import {
    CadData,
    CadLine,
    CadViewer,
    CadMtext,
    generateLineTexts,
    PointsMap,
    CadEntities,
    generatePointsMap,
    setLinesLength,
    CadHatch,
    CadEntity,
    CadLineLike
} from "@cad-viewer";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {ObjectOf, timeout} from "@utils";
import {differenceWith, clamp} from "lodash";
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

@Injectable({
    providedIn: "root"
})
export class AppStatusService {
    collection$ = new BehaviorSubject<CadCollection>("cad");
    cadTotalLength$ = new BehaviorSubject<number>(0);
    cadStatus = new CadStatusNormal();
    cadStatusEnter$ = new BehaviorSubject<CadStatus>(new CadStatusNormal());
    cadStatusExit$ = new BehaviorSubject<CadStatus>(new CadStatusNormal());
    cad = new CadViewer(new CadData({name: "新建CAD"}));
    components = {
        selected$: new BehaviorSubject<CadData[]>([]),
        mode$: new BehaviorSubject<"single" | "multiple">("single"),
        selectable$: new BehaviorSubject<boolean>(true)
    };
    openCad$ = new Subject<void>();
    cadPoints$ = new BehaviorSubject<CadPoints>([]);
    project = "";
    setProject$ = new Subject<void>();
    isAdmin$ = new BehaviorSubject<boolean>(false);
    changelogTimeStamp$ = new BehaviorSubject<number>(-1);
    private _refreshTimeStamp = Number(local.load("refreshTimeStamp") || -1);
    private _projectConfig: ProjectConfig = {};

    constructor(
        private config: AppConfigService,
        private route: ActivatedRoute,
        private router: Router,
        private dataService: CadDataService,
        private message: MessageService,
        private spinner: SpinnerService
    ) {
        this.cad.setConfig(this.config.getConfig());
        this.config.configChange$.subscribe(({newVal}) => {
            const cad = this.cad;
            cad.setConfig(newVal);
        });
        this.components.mode$.subscribe((mode) => {
            this.config.setConfig("subCadsMultiSelect", mode === "multiple");
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
            this.spinner.show(this.spinner.defaultLoaderId);
            if (action) {
                this.config.noUser = true;
            } else {
                const response = await this.dataService.get<boolean>(
                    "user/user/isAdmin",
                    {timeStamp: new Date().getTime()},
                    {silent: true}
                );
                if (!response) {
                    this.dataService.offlineMode = true;
                }
                this.isAdmin$.next(response?.data === true);
                await this.config.getUserConfig();
            }
            let changelogTimeStamp = this.changelogTimeStamp$.value;
            if (changelogTimeStamp < 0) {
                const {changelog} = await this.dataService.getChangelog(1, 1);
                changelogTimeStamp = changelog[0]?.timeStamp || 0;
            }
            this.spinner.hide(this.spinner.defaultLoaderId);
            if (environment.production && changelogTimeStamp > this._refreshTimeStamp) {
                this.message.snack("版本更新，自动刷新页面");
                local.save("refreshTimeStamp", new Date().getTime());
                await timeout(1000);
                location.reload();
                return false;
            }
            this.changelogTimeStamp$.next(changelogTimeStamp);
            this.setProject$.next();

            {
                const response = await this.dataService.post<ProjectConfig>("ngcad/getProjectConfig");
                if (response?.data) {
                    this._projectConfig = response.data;
                } else {
                    this._projectConfig = {};
                }
            }
        }
        return true;
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

    async openCad(data?: CadData, collection?: CadCollection, center = true, beforeOpen?: (data: CadData) => any) {
        const timerName = "openCad";
        timer.start(timerName);
        const cad = this.cad;
        if (data) {
            cad.data = data;
        } else {
            data = cad.data;
        }
        const newConfig: Partial<AppConfig> = {};
        if (collection && this.collection$.value !== collection) {
            this.collection$.next(collection);
        } else {
            collection = this.collection$.value;
        }
        if (collection === "CADmuban") {
            this.config.setConfig({hideLineLength: true, hideLineGongshi: true}, {sync: false});
        }

        const id = data.id;
        const {id: id2, collection: collection2} = this.route.snapshot.queryParams;
        if (id !== id2 || collection !== collection2) {
            this.router.navigate(["/index"], {queryParams: {id, collection}, queryParamsHandling: "merge"});
        }
        this.config.setUserConfig(newConfig);
        await prepareCadViewer(cad);
        setCadData(data, this.project);
        for (const key in replaceMap) {
            this._replaceText(data, key, replaceMap[key]);
        }
        if (Object.keys(data.对应计算条数的配件).length < 1) {
            data.对应计算条数的配件[""] = "";
        }
        suanliaodanZoomIn(data);
        if (collection === "cad") {
            validateLines(data);
        }
        this.generateLineTexts();

        const 算料单CAD模板使用图片装配 = this.getProjectConfigBoolean("算料单CAD模板使用图片装配");
        const shouldUpdatePreview = collection === "CADmuban" && 算料单CAD模板使用图片装配;
        const updatePreview = async (data2: CadData, mode: Parameters<typeof updateCadPreviewImg>[1]) => {
            const result = await Promise.all(
                data2.components.data.map(async (v) => await updateCadPreviewImg(v, mode, !shouldUpdatePreview))
            );
            return result.flat();
        };
        await updatePreview(data, "pre");

        await cad.reset().render();
        if (center) {
            cad.center();
        }
        this.updateCadTotalLength();
        this.updateTitle();

        await cad.render(await updatePreview(data, "post"));

        if (beforeOpen) {
            const res = beforeOpen(data);
            if (res instanceof Promise) {
                await res;
            }
        }
        this.openCad$.next();
        timer.end(timerName, "打开CAD");
    }

    closeCad(data?: CadData) {
        if (!data) {
            data = this.cad.data;
        }
        const data2 = data.clone();
        data2.getAllEntities().forEach((e) => (e.visible = true));
        suanliaodanZoomOut(data2);
        return data2;
    }

    generateLineTexts() {
        const data = this.cad.data;
        if (this.collection$.value === "CADmuban") {
            data.entities.line.forEach((e) => {
                e.children.mtext = e.children.mtext.filter((mt) => !mt.info.isLengthText && !mt.info.isGongshiText);
            });
            data.components.data.forEach((v) => generateLineTexts(v));
        } else {
            generateLineTexts(data);
        }
    }

    getCadPoints(map?: PointsMap | CadEntities, mid?: boolean) {
        if (!map) {
            return [];
        }
        if (map instanceof CadEntities) {
            const midPoints: PointsMap = [];
            if (mid) {
                map.forEach((e) => {
                    if (e instanceof CadLineLike) {
                        midPoints.push({point: e.middle, lines: [e], selected: false});
                    }
                }, true);
            }
            map = generatePointsMap(map).concat(midPoints);
        }
        return map.map((v) => {
            const {x, y} = this.cad.getScreenPoint(v.point.x, v.point.y);
            return {x, y, active: v.selected, lines: v.lines.map((vv) => vv.id)} as CadPoints[0];
        });
    }

    setCadPoints(map: PointsMap | CadEntities = [], opts: {exclude?: {x: number; y: number}[]; mid?: boolean} = {}) {
        const {exclude, mid} = opts;
        const points = this.getCadPoints(map, mid);
        this.cadPoints$.next(differenceWith(points, exclude || [], (a, b) => a.x === b.x && a.y === b.y));
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
        if (this.collection$.value !== "cad" || !this.config.getConfig("validateLines")) {
            return results;
        }
        this.cad.data.components.data.forEach((v) => {
            results.push(validateLines(v));
        });
        this.cad.render();
        return results;
    }

    updateCadTotalLength() {
        this.cadTotalLength$.next(getCadTotalLength(this.cad.data));
    }

    setLinesLength(lines: CadLine[], length: number) {
        setLinesLength(this.cad.data, lines, length);
        this.updateCadTotalLength();
    }

    updateTitle() {
        document.title = this.cad.data.name || "无题";
    }

    focus(entities?: CadEntities | CadEntity[], opt?: {selected?: boolean | ((e: CadEntity) => boolean | null)}) {
        entities = entities ?? this.cad.data.getAllEntities();
        const selected = opt?.selected ?? false;
        entities.forEach((e) => {
            if (!e.visible) {
                return;
            }
            e.selectable = !(e instanceof CadHatch);
            e.selected = (typeof selected === "function" ? selected(e) : selected) ?? false;
            e.opacity = 1;
        });
    }

    blur(entities?: CadEntities | CadEntity[], opt?: {selected?: boolean | ((e: CadEntity) => boolean | null)}) {
        entities = entities ?? this.cad.data.getAllEntities();
        const selected = opt?.selected ?? false;
        entities.forEach((e) => {
            if (!e.visible) {
                return;
            }
            e.selectable = false;
            e.selected = (typeof selected === "function" ? selected(e) : selected) ?? false;
            e.opacity = 0.3;
        });
    }

    openCadInNewTab(id: string, collection: CadCollection) {
        if (!id) {
            return;
        }
        const params = {project: this.project, collection, id};
        open("index?" + new URLSearchParams(params).toString());
    }

    getProjectConfig(): ObjectOf<string>;
    getProjectConfig(key: string): string;
    getProjectConfig(key?: string) {
        if (key) {
            return this._projectConfig[key];
        } else {
            return this._projectConfig;
        }
    }

    getProjectConfigBoolean(key: string) {
        const value = this.getProjectConfig(key);
        return value === "是";
    }
}

export interface Loader {
    id: string;
    start: boolean;
    text?: string;
}

export type CadPoints = {x: number; y: number; active: boolean; lines: string[]}[];

export interface CadComponentsStatus {
    selected: CadData[];
    mode: "single" | "multiple";
    selectable: boolean;
}
