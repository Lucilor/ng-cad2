import {Component, OnInit} from "@angular/core";
import {printCad} from "@app/app.common";
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
	dataError =false;

	constructor(private loader: NgxUiLoaderService) {}

	async ngOnInit() {
		let cachedData: any = null;
		try {
			cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data"));
		} catch (error) {
			console.warn(error);
		}
		if (cachedData) {
			const data = new CadData(cachedData);
			const cad = new CadViewer(data);
			this.loader.startLoader(this.loaderId);
			const url = await printCad(cad);
			location.href = url;
			this.loader.stopLoader(this.loaderId);
		} else {
			this.dataError = true;
		}
	}
}
