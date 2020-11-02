import {Injectable} from "@angular/core";
import {ActivatedRoute, NavigationEnd, Router} from "@angular/router";
import {difference} from "lodash";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {BehaviorSubject, Subject} from "rxjs";
import {CadData} from "../cad-viewer/cad-data/cad-data";
import {generateLineTexts, PointsMap, validateLines} from "../cad-viewer/cad-data/cad-lines";
import {CadViewer} from "../cad-viewer/cad-viewer";
import {setCadData, addCadGongshi} from "../cad.utils";
import {AnyObject} from "../utils/types";
import {AppConfigService} from "./app-config.service";
import {CadCollection, CadDataService, GetCadParams} from "./cad-data.service";

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
	extra: AnyObject;
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

	constructor(
		private config: AppConfigService,
		private loaderService: NgxUiLoaderService,
		private dataService: CadDataService,
		private route: ActivatedRoute,
		private router: Router
	) {
		this.config.configChange$.subscribe(({newVal}) => {
			const cad = this.cad;
			cad.config(newVal);
			const {showCadGongshis} = newVal;
			if (typeof showCadGongshis === "boolean") {
				const cadGongshis = cad.data.getAllEntities().mtext.filter((e) => e.info.isCadGongshi);
				cadGongshis.forEach((e) => (e.visible = showCadGongshis));
				cad.render(cadGongshis);
			}
		});

		const sub = this.router.events.subscribe(async (event) => {
			if (!(event instanceof NavigationEnd)) {
				return;
			}
			sub.unsubscribe();
			let cachedData: any = null;
			let params: any = null;
			try {
				cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data") || "null");
				params = JSON.parse(sessionStorage.getItem("params") || "{}");
			} catch (error) {
				console.warn(error);
			}
			if (cachedData) {
				if (!Array.isArray(cachedData)) {
					cachedData = [cachedData];
				}
				const data: CadData[] = cachedData.map((v: any) => new CadData(v));
				this.openCad(data, params.collection ?? "cad");
			} else {
				const {id, collection} = this.route.snapshot.queryParams;
				const params: Partial<GetCadParams> = {};
				if (id && collection) {
					this.config.config("collection", collection);
					params.id = id;
					params.collection = collection;
				} else {
					const {cadIds, collection} = this.config.config();
					params.ids = cadIds;
					params.collection = collection;
				}
				const result = await this.dataService.getCad(params);
				this.openCad(result.cads);
			}
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

	openCad(data?: CadData[], collection?: CadCollection) {
		const cad = this.cad;
		if (data) {
			cad.data.components.data = data;
			cad.data.info.算料单 = data.some((v) => v.info.算料单);
			data.forEach((v) => {
				setCadData(v);
				addCadGongshi(v, this.config.config("showCadGongshis"));
			});
			this.clearSelectedCads();
		} else {
			data = cad.data.components.data;
			this.refreshSelectedCads();
		}
		if (!collection) {
			collection = this.config.config("collection");
		}
		document.title = data.map((v) => v.name).join(", ");
		if (collection === "cad") {
			data.forEach((v) => validateLines(v));
		}
		this.generateLineTexts();
		this.config.config({cadIds: data.map((v) => v.id), collection});
		this.openCad$.next();
		cad.reset();
		setTimeout(() => cad.center(), 1000);
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
		const cad = this.cad;
		if (this.config.config("collection") === "CADmuban") {
			cad.data.components.data.forEach((v) => {
				v.components.data.forEach((vv) => generateLineTexts(cad, vv));
			});
		} else {
			cad.data.components.data.forEach((v) => generateLineTexts(cad, v));
		}
	}

	setCadPoints(map: PointsMap) {
		const points: CadPoints = map.map((v) => {
			const {x, y} = this.cad.getScreenPoint(v.point.x, v.point.y);
			return {x, y, active: false};
		});
		this.cadPoints$.next(points);
	}
}
