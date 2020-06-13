import {Component, OnInit, Input} from "@angular/core";

@Component({
	selector: "app-cad-points",
	templateUrl: "./cad-points.component.html",
	styleUrls: ["./cad-points.component.scss"]
})
export class CadPointsComponent implements OnInit {
	@Input() points: {x: string; y: string; active: boolean}[];

	constructor() {}

	ngOnInit() {}

	onPointClick() {}
}
