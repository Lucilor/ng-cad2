import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {setGlobal} from "@app/app.common";
import {openNavsDialog} from "@components/dialogs/navs-dialog/navs-dialog.component";
import {NavsData} from "@components/dialogs/navs-dialog/navs-dialog.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {WindowMessageManager} from "@utils";
import {XinghaoOverviewData, XinghaoOverviewItem, XinghaoOverviewTableData} from "./xinghao-overview.types";

@Component({
  selector: "app-xinghao-overview",
  templateUrl: "./xinghao-overview.component.html",
  styleUrls: ["./xinghao-overview.component.scss"]
})
export class XinghaoOverviewComponent implements OnInit {
  table = "p_xinghaoshujukuaisupeizhi";
  data = new XinghaoOverviewData();
  navs: NavsData = [];
  wmm = new WindowMessageManager("xinghaoOverview", this, window.parent);

  constructor(
    private spinner: SpinnerService,
    private dataService: CadDataService,
    private dialog: MatDialog,
    private message: MessageService
  ) {
    setGlobal("xinghaoOverview", this);
  }

  async ngOnInit() {
    this.spinner.show(this.spinner.defaultLoaderId);
    let records = await this.dataService.queryMySql<XinghaoOverviewTableData>({table: this.table, limit: 1});
    if (!records[0]) {
      await this.dataService.tableInsert<XinghaoOverviewTableData>({table: this.table, data: {data: "{}"}});
      records = await this.dataService.queryMySql<XinghaoOverviewTableData>({table: this.table, limit: 1});
    }
    if (records[0]) {
      this.data.import(records[0]);
    } else {
      this.message.error("数据错误");
    }
    const navsResponse = await this.dataService.post<NavsData>("ngcad/getNavs");
    this.navs = this.dataService.getResponseData(navsResponse) || [];
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  async addNavItem(i: number, j?: number) {
    const result = await openNavsDialog(this.dialog, {data: {navs: this.navs}});
    const item = result?.[0];
    if (item) {
      this.data.addItem(this.data.sections[i], j, item);
    }
  }

  async openNavItem(item: XinghaoOverviewItem) {
    this.wmm.postMessage("openNavItemStart", item);
    await this.wmm.waitForMessage("openNavItemEnd");
  }

  async submit() {
    const data = this.data.export();
    this.spinner.show(this.spinner.defaultLoaderId);
    this.dataService.tableUpdate<XinghaoOverviewTableData>({table: this.table, tableData: {vid: this.data.id, data}});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }
}
