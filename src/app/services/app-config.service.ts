import {Injectable, OnDestroy} from "@angular/core";
import {BehaviorSubject} from "rxjs";
import {session} from "../app.common";
import {CadViewerConfig} from "../cad-viewer/cad-viewer";
import {CadCollection} from "./cad-data.service";

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
	config$: BehaviorSubject<AppConfig>;

	constructor() {
		let config: AppConfig = {
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
			showCadGongshis: true,
			infoTabIndex: 0,
			cadIds: [],
			collection: "cad"
		};
		const cachedConfig = session.load("config") as Partial<AppConfig>;
		if (cachedConfig) {
			delete cachedConfig.width;
			delete cachedConfig.height;
			config = {...config, ...cachedConfig};
		}
		this.config$ = new BehaviorSubject(config);
		this.config$.subscribe((config) => session.save("config", config));
		window.addEventListener("unload", () => session.save("config", this.config()));
	}

	config(): AppConfig;
	config<T extends keyof AppConfig>(key: T): AppConfig[T];
	config(config: Partial<AppConfig>): void;
	config<T extends keyof AppConfig>(key: T, value: AppConfig[T]): void;
	config<T extends keyof AppConfig>(key?: T | Partial<AppConfig>, value?: AppConfig[T]) {
		if (typeof key === "string") {
			if (value !== undefined) {
				const obj: Partial<AppConfig> = {};
				obj[key] = value;
				this.config$.next({...this.config$.getValue(), ...obj});
				return;
			} else {
				return this.config$.getValue()[key];
			}
		} else if (typeof key === "object") {
			this.config$.next({...this.config$.getValue(), ...key});
			return;
		} else {
			return this.config$.getValue();
		}
	}
}
