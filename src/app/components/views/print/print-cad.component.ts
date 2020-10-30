import {AfterViewInit, Component} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {timeout} from "@src/app/app.common";
import {printCads} from "@src/app/cad.utils";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {CadDataService} from "@src/app/services/cad-data.service";
import {NgxUiLoaderService} from "ngx-ui-loader";

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
		private message: MessageService
	) {}

	async ngAfterViewInit() {
		await timeout(0);
		const codes = this.route.snapshot.queryParams.codes;
		if (!codes) {
			this.message.alert("缺少订单号");
			return;
		}
		this.loader.startLoader(this.loaderId);
		this.loaderText = "正在获取数据...";
		const dataArr = await this.dataService.getSuanliaodan(codes.split(","));
		if (dataArr.length) {
			this.loaderText = "正在打印CAD...";
			const url = await printCads(dataArr);
			location.href = url;
			// window.open(url);
		}
		this.loader.stopLoader(this.loaderId);
	}
}
