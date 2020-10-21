import {AfterViewInit, Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {printCads, timeout} from "@app/app.common";
import {CadDataService} from "@src/app/services/cad-data.service";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {openMessageDialog} from "../message/message.component";

@Component({
	selector: "app-print-cad",
	templateUrl: "./print-cad.component.html",
	styleUrls: ["./print-cad.component.scss"]
})
export class PrintCadComponent implements AfterViewInit {
	loaderId = "printLoader";
	loaderText = "";

	constructor(
		private loader: NgxUiLoaderService,
		private route: ActivatedRoute,
		private dataService: CadDataService,
		private dialog: MatDialog
	) {}

	async ngAfterViewInit() {
		await timeout(0);
		const codes = this.route.snapshot.queryParams.codes;
		if (!codes) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "缺少订单号"}});
			return;
		}
		this.loader.startLoader(this.loaderId);
		this.loaderText = "正在获取数据...";
		const dataArr = await this.dataService.getSuanliaodan(codes.split(","));
		this.loaderText = "正在打印CAD...";
		const url = await printCads(dataArr);
		location.href = url;
		// window.open(url);
		this.loader.stopLoader(this.loaderId);
	}
}
