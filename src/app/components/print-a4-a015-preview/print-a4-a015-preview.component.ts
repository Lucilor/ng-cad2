import {Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {timeout} from "@src/app/app.common";
import {PerfectScrollbarComponent} from "ngx-perfect-scrollbar";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {LoadingAction} from "@src/app/store/actions";

export type PreviewData = {
	CAD?: any;
	code: string;
	codeText?: string;
	text: string[];
	type: "说明" | "CAD";
	zhankai: string;
	title?: string;
	cadImg: string;
}[][];

@Component({
	selector: "app-print-a4-a015-preview",
	templateUrl: "./print-a4-a015-preview.component.html",
	styleUrls: ["./print-a4-a015-preview.component.scss"]
})
export class PrintA4A015PreviewComponent implements OnInit, OnDestroy {
	data: PreviewData = [];
	printing = false;

	constructor(private dataService: CadDataService, private cd: ChangeDetectorRef, private store: Store<State>) {}

	async ngOnInit() {
		Object.assign(window, {app: this});
		document.title = "订单配件标签";
		document.body.style.overflowX = "hidden";
		document.body.style.overflowY = "auto";
		const response = await this.dataService.request("order/printCode/printA4A015Preview", "printA4A015Preview", "GET");
		if (response) {
			this.data = response.data;
		}
		const total = this.data.reduce((total, v) => total + v.filter((vv) => vv.type === "CAD").length, 0);
		let done = 0;
		this.store.dispatch<LoadingAction>({name: "loadCads", type: "set loading progress", progress: 0});
		for (const page of this.data) {
			for (const card of page) {
				if (card.type === "CAD") {
					const cad = new CadViewer(new CadData(card.CAD), {
						padding: 15,
						width: 92,
						height: 92,
						backgroundColor: 0xffffff
					});
					document.body.appendChild(cad.dom);
					if (card.text.every((v) => !v.includes("花件"))) {
						cad.config.showLineLength = 10 / cad.scale;
					}
					await timeout(0);
					card.cadImg = cad.render().exportImage().src;
					cad.destroy();
				}
				done++;
				this.store.dispatch<LoadingAction>({name: "loadCads", type: "set loading progress", progress: done / total});
			}
			await timeout(0);
		}
		this.store.dispatch<LoadingAction>({name: "loadCads", type: "set loading progress", progress: -1});
	}

	ngOnDestroy() {
		document.body.style.overflowX = "";
		document.body.style.overflowY = "";
	}

	printPages() {
		this.printing = true;
		this.cd.detectChanges();
		print();
		this.printing = false;
	}
}
