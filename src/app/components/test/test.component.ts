import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {SVG} from "@svgdotjs/svg.js";
import {CadViewer} from "@src/app/cad-viewer-svg/cad-viewer";
import {CadData} from "@src/app/cad-viewer-svg/cad-data/cad-data";

@Component({
	selector: "app-test",
	templateUrl: "./test.component.html",
	styleUrls: ["./test.component.scss"]
})
export class TestComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;

	constructor(private dataService: CadDataService) {}

	async ngAfterViewInit() {
		const data = (await this.dataService.getCadData({ids: ["5ecf6e77fe8ba52c90004c02"], collection: "CADmuban"}))[0];
		if (!data) {
			return;
		}
		const cad = new CadViewer(new CadData(data.export()), this.cadContainer.nativeElement, {
			width: innerWidth,
			height: innerHeight,
			backgroundColor: 0,
			padding: 20
		});
		console.log(cad);
		// const draw = SVG().addTo(this.cadContainer.nativeElement).size(innerWidth, innerHeight);
		// const entities = data.getAllEntities();
		// const {x, y, width, height} = data.getBounds();
		// const scale = 3;
		// entities.line.forEach(({start, end, color}) => {
		// 	const line = draw.line([start.x, -start.y, end.x, -end.y]);
		// 	line.attr({stroke: color.getStyle(), "stroke-width": 1 / scale});
		// });
		// entities.circle.forEach(({center, radius, color}) => {
		// 	const circle = draw.circle(radius);
		// 	circle.move(center.x - radius / 2, -center.y - radius / 2);
		// 	circle.attr({stroke: color.getStyle(), "stroke-width": 1 / scale});
		// });
		// entities.arc.forEach(({start_angle, end_angle, radius, clockwise, curve, color}) => {
		// 	const {x: x0, y: y0} = curve.getPoint(0);
		// 	const {x: x1, y: y1} = curve.getPoint(1);
		// 	const l0 = Math.PI * 2 * radius;
		// 	const isLargeArc = curve.getLength() / l0 > 0.5 ? 1 : 0;
		// 	const arc = draw.path([
		// 		["M", x0, -y0],
		// 		["A", radius, radius, end_angle - start_angle, isLargeArc, clockwise ? 1 : 0, x1, -y1]
		// 	]);
		// 	arc.attr({stroke: color.getStyle(), "fill-opacity": 0, "stroke-width": 1 / scale});
		// });
		// Object.assign(window, {draw});
		// // draw.viewbox(x - width / 2, -(y + height / 2), width, height);
		// draw.viewbox(x - innerWidth / 2, -y - innerHeight / 2, innerWidth, innerHeight);
		// draw.css("background-color", "black");
		// draw.css("transform-origin", "center");
		// draw.css("transform", `scale(${scale})`);
	}
}
