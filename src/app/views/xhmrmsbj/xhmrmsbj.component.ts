import {Component, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {getMokuaiTitle, getStep1Data, Step1Data, ZixuanpeijianTypesInfoItem} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {MrbcjfzXinghao, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.types";
import {MsbjData, MsbjInfo} from "@views/msbj/msbj.types";
import {cloneDeep, isEqual} from "lodash";
import {XhmrmsbjTableData, XhmrmsbjData} from "./xhmrmsbj.types";

@Component({
  selector: "app-xhmrmsbj",
  templateUrl: "./xhmrmsbj.component.html",
  styleUrls: ["./xhmrmsbj.component.scss"]
})
export class XhmrmsbjComponent implements OnInit {
  table = "";
  id = "";
  tableData: XhmrmsbjTableData | null = null;
  data: XhmrmsbjData | null = null;
  msbjs: MsbjInfo[] = [];
  step1Data: Step1Data = {prefix: "", options: {}, typesInfo: {}};
  xinghao: MrbcjfzXinghaoInfo | null = null;
  bancaiList: BancaiList[] = [];
  activeMenshanKey: string | null = null;
  activeMsbj: MsbjInfo | null = null;
  activeRectInfo: MsbjRectInfo | null = null;
  get activeMsbjInfo() {
    return this.data?.menshanbujuInfos[this.activeMenshanKey || ""];
  }
  getMokuaiTitle = getMokuaiTitle;
  showMokuais = false;
  mokuaiTemplateType!: {$implicit: ZixuanpeijianTypesInfoItem | null; type1: string; type2: string; isActive?: boolean};

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private dialog: MatDialog,
    private spinner: SpinnerService,
    private message: MessageService
  ) {
    setGlobal("xhmrmsbj", this);
  }

  async ngOnInit() {
    const {table, id} = this.route.snapshot.queryParams;
    this.table = table;
    this.id = id;
    const records = await this.dataService.queryMySql<XhmrmsbjTableData>({table, filter: {where: {vid: id}}});
    this.tableData = records?.[0] || null;
    this.data = this.tableData ? new XhmrmsbjData(this.tableData) : null;
    const records2 = await this.dataService.queryMySql<MsbjData>({table: "p_menshanbuju"});
    this.msbjs = records2.map((item) => new MsbjInfo(item, "peizhishuju"));
    const step1Data = await getStep1Data(this.dataService);
    console.log(this.tableData);
    const records3 = await this.dataService.queryMySql<MrbcjfzXinghao>({
      table: "p_xinghao",
      filter: {where: {vid: this.tableData?.xinghao}}
    });
    this.xinghao = records3?.[0] ? new MrbcjfzXinghaoInfo(records3[0]) : null;
    const response = await this.dataService.post<BancaiList[]>("ngcad/getBancaiList");
    this.bancaiList = response?.data || [];
    if (step1Data) {
      this.step1Data = step1Data;
    }
  }

  returnZero() {
    return 0;
  }

  selectMenshanKey(key: string) {
    const msbj = this.activeMsbj;
    const msbjInfo = this.activeMsbjInfo;
    if (msbj && msbjInfo) {
      for (const rectInfo of msbj.rectInfos) {
        const 选中模块 = msbjInfo.模块节点?.find((v) => v.层id === rectInfo.vid);
        if (rectInfo.isBuju && !选中模块) {
          this.message.error("布局中存在未选中的模块");
          return;
        }
      }
    }
    this.activeMenshanKey = key;
    this.setActiveMsbj(this.activeMsbjInfo?.选中布局);
  }

  setActiveMsbj(vid?: number) {
    this.showMokuais = false;
    this.activeMsbj = cloneDeep(this.msbjs.find((item) => item.vid === vid) || null);
    this.activeRectInfo = null;
  }

  async setMsbj() {
    const infos = this.data?.menshanbujuInfos;
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
      // const 选中模块 = infos[key].选中模块;
      // if (选中模块 && msbjBefore) {
      //   for (const rectInfoBefore of msbjBefore.rectInfos) {
      //     const rectInfoAfter = msbjAfter?.rectInfos.find((item) => item.vid === rectInfoBefore.vid);
      //     if (!rectInfoAfter && rectInfoBefore.vid in 选中模块) {
      //       delete 选中模块[rectInfoBefore.vid];
      //     }
      //   }
      // }
    }
  }

  selectRectBefore() {
    if (this.activeRectInfo && !this.getMokuaiTemplate(this.activeRectInfo).$implicit) {
      this.message.error("请先选择模块");
      return false;
    }
    return true;
  }

  selectRect(info: MsbjRectInfo | null) {
    if (isEqual(this.activeRectInfo, info)) {
      return;
    }
    if (info?.raw.isBuju) {
      this.showMokuais = true;
      this.activeRectInfo = info;
    } else {
      this.showMokuais = false;
      this.activeRectInfo = null;
    }
  }

  selectMokuai(mokuai: ZixuanpeijianTypesInfoItem | null) {
    const msbjInfo = this.activeMsbjInfo;
    const rectInfo = this.activeRectInfo;
    if (!mokuai || !msbjInfo || !rectInfo) {
      return;
    }
    // if (!msbjInfo.选中模块) {
    //   msbjInfo.选中模块 = [];
    // }
    // msbjInfo.选中模块[rectInfo.raw.vid] = mokuai.id;
  }

  getMokuaiTemplate(rectInfo: MsbjRectInfo | null): XhmrmsbjComponent["mokuaiTemplateType"] {
    const mokuaiId = this.activeMsbjInfo?.模块节点?.find((v) => v.层id === rectInfo?.raw.vid)?.选中模块.模块id;
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

  async submit() {
    const {table, data: dataInfo} = this;
    if (!dataInfo) {
      return;
    }
    // for (const menshanKey in dataInfo.menshanbujuInfos) {
    //   const msbjInfo = dataInfo.menshanbujuInfos[menshanKey];
    //   const msbj = this.msbjs.find((item) => item.vid === msbjInfo.选中布局);
    //   const 选中模块 = msbjInfo.选中模块 || {};
    //   if (msbj) {
    //     for (const rectInfo of msbj.rectInfos) {
    //       if (rectInfo.isBuju && !选中模块[rectInfo.vid]) {
    //         this.message.error("布局中存在未选中的模块");
    //         return;
    //       }
    //     }
    //   }
    // }
    const tableData: TableUpdateParams<MsbjData>["tableData"] = {vid: dataInfo.vid};
    tableData.peizhishuju = JSON.stringify(dataInfo.menshanbujuInfos);
    this.spinner.show(this.spinner.defaultLoaderId);
    await this.dataService.tableUpdate({table, tableData});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  async openMrbcjfzDialog() {
    if (!this.xinghao) {
      return;
    }
    const result = await openMrbcjfzDialog(this.dialog, {data: {id: this.xinghao.raw.vid, table: "p_xinghao"}});
    if (result) {
      this.xinghao = result;
    }
  }
}
