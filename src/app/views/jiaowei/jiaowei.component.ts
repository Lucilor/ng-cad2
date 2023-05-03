import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {Jiaowei, JiaoweiTableData, jiaoweiAnchorOptions} from "./jiaowei";

const table = "p_menjiao" as const;

@Component({
  selector: "app-jiaowei",
  templateUrl: "./jiaowei.component.html",
  styleUrls: ["./jiaowei.component.scss"]
})
export class JiaoweiComponent implements OnInit {
  jiaowei = new Jiaowei();
  jiaoweiAnchorOptions = jiaoweiAnchorOptions;

  constructor(private dataService: CadDataService, private router: ActivatedRoute, private message: MessageService) {}

  async ngOnInit() {
    setGlobal("jiaowei", this);
    const {id} = this.router.snapshot.queryParams;
    const data = await this.dataService.queryMySql<JiaoweiTableData>({table, filter: {where: {vid: id}}});
    try {
      this.jiaowei.import(JSON.parse(data[0].jiaowei || ""));
    } catch (error) {
      console.error(error);
      this.message.error("数据格式错误");
    }
    for (const num of ["2", "3", "4", "5"]) {
      if (!this.jiaowei.data[num]) {
        this.jiaowei.addItem({条件: [`门铰数量==${num}`]});
      }
    }
  }

  submit() {
    const {id} = this.router.snapshot.queryParams;
    const tableData: TableUpdateParams<JiaoweiTableData>["tableData"] = {vid: id};
    tableData.jiaowei = JSON.stringify(this.jiaowei.export());
    this.dataService.tableUpdate({table, tableData});
  }
}
