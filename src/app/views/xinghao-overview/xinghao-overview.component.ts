import {Component, OnInit} from "@angular/core";
import {Validators} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";

@Component({
  selector: "app-xinghao-overview",
  templateUrl: "./xinghao-overview.component.html",
  styleUrls: ["./xinghao-overview.component.scss"]
})
export class XinghaoOverviewComponent implements OnInit {
  xinghao: TableDataBase | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private spinner: SpinnerService,
    private dataService: CadDataService,
    private message: MessageService
  ) {
    setGlobal("xinghaoOverview", this);
  }

  async ngOnInit() {
    let {id} = this.route.snapshot.queryParams;
    if (!id) {
      const value = await this.message.prompt({
        type: "string",
        label: "型号",
        placeholder: "请输入型号id或名字",
        value: "",
        validators: Validators.required
      });
      if (value) {
        id = value;
        this.router.navigate(this.route.snapshot.url, {queryParams: {id: value}, queryParamsHandling: "merge"});
      }
    }
    const table = "p_xinghao";
    this.spinner.show(this.spinner.defaultLoaderId);
    let records = await this.dataService.queryMySql({table, filter: {where: {vid: id}}});
    if (records.length < 1) {
      records = await this.dataService.queryMySql({table, filter: {where: {mingzi: id}}});
    }
    this.spinner.hide(this.spinner.defaultLoaderId);
    if (records[0]) {
      this.xinghao = records[0];
    }
  }

  async getXinghao(id: string) {
    const table = "p_xinghao";
    this.spinner.show(this.spinner.defaultLoaderId);
    let records = await this.dataService.queryMySql({table, filter: {where: {vid: id}}});
    if (records.length < 1) {
      records = await this.dataService.queryMySql({table, filter: {where: {mingzi: id}}});
    }
    this.spinner.hide(this.spinner.defaultLoaderId);
    if (records[0]) {
      return records[0];
    } else {
      return null;
    }
  }
}
