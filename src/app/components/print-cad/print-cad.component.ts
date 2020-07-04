import {Component, OnInit} from "@angular/core";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {timeout} from "@src/app/app.common";

@Component({
	selector: "app-print-cad",
	templateUrl: "./print-cad.component.html",
	styleUrls: ["./print-cad.component.scss"]
})
export class PrintCadComponent implements OnInit {
	src = "assets/loading.gif";
	scale = 16;

	constructor() {}

	ngOnInit() {
		let cachedData = null;
		try {
			cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data"));
		} catch (error) {
			console.warn(error);
		}
		if (cachedData) {
			this.print(new CadData(cachedData));
		}
	}

	async print(data: CadData) {
		const width = 210 * this.scale;
		const height = 297 * this.scale;
		data.entities.dimension.forEach((e) => (e.selected = true));
		const cad = new CadViewer(data, {
			width,
			height,
			backgroundColor: 0xffffff,
			padding: 18
		});
		document.body.appendChild(cad.dom);
		cad.render();
		await timeout(100);
		this.src = cad.exportImage().src;
		cad.destroy();
		print();
		await timeout(1000);
		close();
	}
}
