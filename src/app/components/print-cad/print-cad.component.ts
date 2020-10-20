import {Component, OnInit} from "@angular/core";
import {printCads} from "@app/app.common";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {NgxUiLoaderService} from "ngx-ui-loader";

@Component({
	selector: "app-print-cad",
	templateUrl: "./print-cad.component.html",
	styleUrls: ["./print-cad.component.scss"]
})
export class PrintCadComponent implements OnInit {
	loaderId = "printLoader";
	dataError = false;

	constructor(private loader: NgxUiLoaderService) {}

	async ngOnInit() {
		let cachedData: any = null;
		try {
			cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data"));
		} catch (error) {
			console.warn(error);
		}
		if (cachedData && Array.isArray(cachedData)) {
			const dataArr: CadData[] = [];
			cachedData.forEach((v) => dataArr.push(new CadData(v)));
			this.loader.startLoader(this.loaderId);
			const url = await printCads(dataArr);
			location.href = url;
			// window.open(url);
			this.loader.stopLoader(this.loaderId);
		} else {
			this.dataError = true;
		}
	}
}
