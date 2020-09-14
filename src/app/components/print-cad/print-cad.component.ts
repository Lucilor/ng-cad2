import {Component, OnInit, AfterViewInit} from "@angular/core";
import {timeout, session} from "@app/app.common";

@Component({
	selector: "app-print-cad",
	templateUrl: "./print-cad.component.html",
	styleUrls: ["./print-cad.component.scss"]
})
export class PrintCadComponent implements OnInit, AfterViewInit {
	src = "";

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
