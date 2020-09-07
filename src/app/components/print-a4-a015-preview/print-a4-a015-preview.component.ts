import {Component, OnInit, ChangeDetectorRef, OnDestroy} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {timeout} from "@src/app/app.common";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {LoadingAction} from "@src/app/store/actions";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {generateLineTexts} from "@src/app/cad-viewer/cad-data/cad-lines";

export type PreviewData = {
	CAD?: any;
	code: string;
	codeText?: string;
	text: string[];
	type: "说明" | "CAD";
	zhankai: string;
	title?: string;
	cadImg: SafeUrl;
}[][];

@Component({
	selector: "app-print-a4-a015-preview",
	templateUrl: "./print-a4-a015-preview.component.html",
	styleUrls: ["./print-a4-a015-preview.component.scss"]
})
export class PrintA4A015PreviewComponent implements OnInit, OnDestroy {
	data: PreviewData = [];
	printing = false;

	constructor(
		private dataService: CadDataService,
		private cd: ChangeDetectorRef,
		private store: Store<State>,
		private sanitizer: DomSanitizer
	) {}

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
			for (const card of page.slice(0, 2)) {
				if (card.type === "CAD") {
					const cad = new CadViewer(new CadData(card.CAD), {
						padding: 15,
						width: 92,
						height: 92,
						backgroundColor: "white"
					});
					document.body.appendChild(cad.dom);
					if (card.text.every((v) => !v.includes("花件"))) {
						cad.config.lineTexts.lineLength = 10 / cad.zoom();
					}
					generateLineTexts(cad, cad.data);
					cad.render();
					await timeout(0);
					card.cadImg = this.sanitizer.bypassSecurityTrustUrl(cad.toBase64());
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

	getTop(i: number) {
		switch (Math.floor(i / 4)) {
			case 0:
				return "10px";
			case 1:
				return "9px";
			case 2:
				return "10px";
			case 3:
				return "11px";
			case 4:
				return "11px";
			case 5:
				return "11px";
			case 6:
				return "11px";
			default:
				return "0px";
		}
	}

	getLeft(i: number) {
		return (i % 4 ? 10 : 0) + "px";
	}
}
