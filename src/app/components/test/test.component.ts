import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";

@Component({
	selector: "app-test",
	templateUrl: "./test.component.html",
	styleUrls: ["./test.component.scss"]
})
export class TestComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;

	constructor(private dataService: CadDataService) {}

	async ngAfterViewInit() {
		await this.print();
	}

	async print(scale = 10) {
		// const size = [210, 297];
		// Math.min(innerWidth / size[0], innerHeight / size[1]);
		const width = 210 * scale;
		const height = 297 * scale;
		const data = (await this.dataService.getCadData({ids: ["5ecf6e77fe8ba52c90004c02"], collection: "CADmuban"}))[0];
		console.log(data);
		if (!data) {
			return;
		}
		const cad = new CadViewer(new CadData(data.export()), {
			width,
			height,
			backgroundColor: 0xffffff,
			padding: 20
		});
		this.cadContainer.nativeElement.append(cad.dom);
		console.log(cad);
	}
}
