import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {setGlobal} from "@app/app.common";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {Jiaowei, jiaoweiAnchorOptions} from "./jiaowei";

const table = "p_menjiao" as const;
const dataField = "jiaowei" as const;

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
    const data = await this.dataService.tableSelect({table, search: {vid: id}});
    try {
      this.jiaowei.import(JSON.parse(data[0][dataField]));
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
    const tableData: TableUpdateParams["tableData"] = {vid: id};
    tableData[dataField] = JSON.stringify(this.jiaowei.export());
    this.dataService.tableUpdate({table, tableData});
  }
}
