import {Component, OnInit} from "@angular/core";
import {environment} from "@src/environments/environment";
import {AppConfigService} from "./services/app-config.service";
import {AppStatusService} from "./services/app-status.service";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
	title = "ng-cad2";
	loaderText = "";

	constructor(private status: AppStatusService, private config: AppConfigService) {}

	ngOnInit() {
		this.status.loaderText$.subscribe((loaderText) => {
			this.loaderText = loaderText;
		});
		const cad = this.status.cad;
		Reflect.defineProperty(window, "cad", {value: cad});
		Reflect.defineProperty(window, "config", {value: this.config.config.bind(this.config)});
		Reflect.defineProperty(window, "status", {value: this.status});
		Reflect.defineProperty(window, "data0", {get: () => cad.data.components.data[0]});
		Reflect.defineProperty(window, "data0Ex", {get: () => cad.data.components.data[0].export()});
		Reflect.defineProperty(window, "selected", {get: () => cad.selected()});
		Reflect.defineProperty(window, "selectedArray", {get: () => cad.selected().toArray()});
		Reflect.defineProperty(window, "selected0", {get: () => cad.selected().toArray()[0]});

		if (this.config.config("collection") === "CADmuban") {
			this.config.config("hideLineLength", true);
		}

		// let lastRenderTime = 0;
		// cad.on("render", (_event, {entities}) => {
		// 	if (!environment.production) {
		// 		const now = performance.now();
		// 		const interval = (now - lastRenderTime).toFixed(2);
		// 		const length = entities.length;
		// 		const entitiesMsg = `${length} entit${length === 1 ? "y" : "ies"}`;
		// 		console.log(`%c [debug] cad render interval: ${interval}ms; ${entitiesMsg}`, "color:#f321c0");
		// 		lastRenderTime = now;
		// 	}
		// });
	}
}
