import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {getMokuaiTitle, getStep1Data, Step1Data, ZixuanpeijianTypesInfoItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
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
  step1Data: Step1Data = {prefix: "", options: {}, typesInfo: {}};
  activeMenshanKey: string | null = null;
  activeMsbj: MsbjInfo | null = null;
  activeRectInfo: MsbjRectInfo | null = null;
  get activeMokuai(): XhmrmsbjComponent["mokuaiTemplateType"] {
    const rectInfo = this.activeRectInfo;
    const mokuaiId = this.dataInfo?.menshanbujuInfos[this.activeMenshanKey || ""]?.选中模块?.[rectInfo?.raw.vid || ""];
    if (mokuaiId) {
      for (const type1 in this.step1Data.typesInfo) {
        const type1Info = this.step1Data.typesInfo[type1];
        for (const type2 in type1Info) {
          const type2Info = type1Info[type2];
          if (type2Info.id === mokuaiId) {
            return {$implicit: type2Info, type1, type2, isActive: true};
          }
        }
      }
    }
    return {$implicit: null, type1: "", type2: "", isActive: true};
  }
  getMokuaiTitle = getMokuaiTitle;
  showMokuais = false;
  mokuaiTemplateType!: {$implicit: ZixuanpeijianTypesInfoItem | null; type1: string; type2: string; isActive?: boolean};

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
    const step1Data = await getStep1Data(this.dataService);
    if (step1Data) {
      this.step1Data = step1Data;
    }
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
    this.showMokuais = false;
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
      const msbjBefore = this.activeMsbj;
      infos[key].选中布局 = result[0].vid;
      this.setActiveMsbj(infos[key].选中布局);
      const msbjAfter = this.activeMsbj;
      const 选中模块 = infos[key].选中模块;
      if (选中模块 && msbjBefore) {
        for (const rectInfoBefore of msbjBefore.rectInfos) {
          const rectInfoAfter = msbjAfter?.rectInfos.find((item) => item.vid === rectInfoBefore.vid);
          if (!rectInfoAfter && rectInfoBefore.vid in 选中模块) {
            delete 选中模块[rectInfoBefore.vid];
          }
        }
      }
      console.log(选中模块);
    }
  }

  selectRect(info: MsbjRectInfo | null) {
    if (info?.raw.isBuju) {
      this.showMokuais = true;
      this.activeRectInfo = info;
    } else {
      this.showMokuais = false;
      this.activeRectInfo = null;
    }
  }

  selectMokuai(mokuai: ZixuanpeijianTypesInfoItem | null) {
    const msbjInfo = this.dataInfo?.menshanbujuInfos[this.activeMenshanKey || ""];
    const rectInfo = this.activeRectInfo;
    if (!mokuai || !msbjInfo || !rectInfo) {
      return;
    }
    if (!msbjInfo.选中模块) {
      msbjInfo.选中模块 = {};
    }
    msbjInfo.选中模块[rectInfo.raw.vid] = mokuai.id;
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
