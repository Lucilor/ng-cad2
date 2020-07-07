import {Component, OnInit, AfterViewInit} from "@angular/core";
import {timeout, session} from "@src/app/app.common";

@Component({
	selector: "app-print-cad",
	templateUrl: "./print-cad.component.html",
	styleUrls: ["./print-cad.component.scss"]
})
export class PrintCadComponent implements OnInit, AfterViewInit {
	src = "";
	scale = 16;

	constructor() {}

	async ngOnInit() {
		this.src = session.load("printCadImg");
	}

	async ngAfterViewInit(){
		await timeout(0);
		print();
		await timeout(1000);
		close();
	}
}
