import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {MsbjData, MsbjInfo} from "@views/msbj/msbj.types";
import {XhmrmsbjData, XhmrmsbjInfo} from "./xhmrmsbj.types";

@Component({
  selector: "app-xhmrmsbj",
  templateUrl: "./xhmrmsbj.component.html",
  styleUrls: ["./xhmrmsbj.component.scss"]
})
export class XhmrmsbjComponent implements OnInit {
  table = "";
  id = "";
  data: XhmrmsbjData | null = null;
  dataInfo: XhmrmsbjInfo | null = null;
  msbjs: MsbjInfo[] = [];
  activeMenshanKey: string | null = null;
  activeMsbj: MsbjInfo | null = null;

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private dialog: MatDialog,
    private spinner: SpinnerService
  ) {
    setGlobal("xhmrmsbj", this);
  }

  async ngOnInit() {
    const {table, id} = this.route.snapshot.queryParams;
    this.table = table;
    this.id = id;
    const records = await this.dataService.queryMySql<XhmrmsbjData>({table, filter: {where: {vid: id}}});
    this.data = records?.[0] || null;
    this.dataInfo = this.data ? new XhmrmsbjInfo(this.data) : null;
    const records2 = await this.dataService.queryMySql<MsbjData>({table: "p_menshanbuju"});
    this.msbjs = records2.map((item) => new MsbjInfo(item, "peizhishuju"));
  }

  returnZero() {
    return 0;
  }

  selectMenshanKey(key: string) {
    this.activeMenshanKey = key;
    const vid = this.dataInfo?.menshanbujuInfos?.[key]?.选中布局;
    this.setActiveMsbj(vid);
  }

  setActiveMsbj(vid?: number) {
    this.activeMsbj = this.msbjs.find((item) => item.vid === vid) || null;
  }

  async setMsbj() {
    const infos = this.dataInfo?.menshanbujuInfos;
    const key = this.activeMenshanKey;
    if (!key || !infos) {
      return;
    }
    const vid = infos[key].选中布局;
    const checkedVids: number[] = [];
    if (vid) {
      checkedVids.push(vid);
    }
    const result = await openCadOptionsDialog(this.dialog, {data: {name: "p_menshanbuju", checkedVids, multi: false}});
    if (result?.[0]) {
      infos[key].选中布局 = result[0].vid;
      this.setActiveMsbj(infos[key].选中布局);
    }
  }

  async submit() {
    const {table, dataInfo} = this;
    if (!dataInfo) {
      return;
    }
    const tableData: TableUpdateParams<MsbjData>["tableData"] = {vid: dataInfo.vid};
    tableData.peizhishuju = JSON.stringify(dataInfo.menshanbujuInfos);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }
}
