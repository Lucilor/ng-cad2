import {Component, OnInit, ViewChild} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {
  getMokuaiTitle,
  getStep1Data,
  Step1Data,
  ZixuanpeijianMokuaiItem,
  ZixuanpeijianTypesInfoItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList, TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {timeout} from "@utils";
import {MrbcjfzXinghao, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.types";
import {MsbjData, MsbjInfo} from "@views/msbj/msbj.types";
import {cloneDeep, isEqual} from "lodash";
import {menshanKeys, XhmrmsbjData, XhmrmsbjMokuai, XhmrmsbjTableData, XhmrmsbjTabName, xhmrmsbjTabNames} from "./xhmrmsbj.types";

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
  fenleis: TableDataBase[] = [];
  msbjs: MsbjInfo[] = [];
  step1Data: Step1Data = {prefix: "", options: {}, typesInfo: {}};
  mokuais: XhmrmsbjMokuai[] = [];
  xinghao: MrbcjfzXinghaoInfo | null = null;
  bancaiList: BancaiList[] = [];
  activeMenshanKey: string | null = null;
  activeMsbj: MsbjInfo | null = null;
  activeRectInfo: MsbjRectInfo | null = null;
  get activeMsbjInfo() {
    return this.data?.menshanbujuInfos[this.activeMenshanKey || ""];
  }
  get activeMokuaiNode() {
    return this.activeMsbjInfo?.模块节点?.find((v) => v.层id === this.activeRectInfo?.raw.vid);
  }
  getMokuaiTitle = getMokuaiTitle;
  showMokuais = false;
  mokuaiTemplateType!: {$implicit: XhmrmsbjMokuai | null; isActive?: boolean};
  tabNames = xhmrmsbjTabNames;
  activeTabName: XhmrmsbjTabName = "门扇模块";
  mokuaiInputInfos: InputInfo[] = [];
  @ViewChild(MsbjRectsComponent) msbjRectsComponent?: MsbjRectsComponent;

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
    const step1Data = await getStep1Data(this.dataService);
    this.mokuais = [];
    if (step1Data) {
      this.step1Data = step1Data;
      for (const type1 in step1Data.typesInfo) {
        for (const type2 in step1Data.typesInfo[type1]) {
          const info = step1Data.typesInfo[type1][type2];
          this.mokuais.push({...info, type1, type2, totalWidth: "", totalHeight: "", cads: [], 板材数据: {}});
        }
      }
    }

    const {table, id} = this.route.snapshot.queryParams;
    this.table = table;
    this.id = id;
    const records = await this.dataService.queryMySql<XhmrmsbjTableData>({table, filter: {where: {vid: id}}});
    this.tableData = records?.[0] || null;
    this.data = this.tableData ? new XhmrmsbjData(this.tableData, this.step1Data.typesInfo) : null;
    this.fenleis = await this.dataService.queryMySql<TableDataBase>({table: "p_gongnengfenlei", fields: ["vid", "mingzi"]});
    const records2 = await this.dataService.queryMySql<MsbjData>({table: "p_menshanbuju"});
    this.msbjs = records2.map((item) => new MsbjInfo(item, "peizhishuju"));
    const records3 = await this.dataService.queryMySql<MrbcjfzXinghao>({
      table: "p_xinghao",
      filter: {where: {vid: this.tableData?.xinghao}}
    });
    this.xinghao = records3?.[0] ? new MrbcjfzXinghaoInfo(records3[0]) : null;
    const response = await this.dataService.post<BancaiList[]>("ngcad/getBancaiList");
    this.bancaiList = response?.data || [];

    await timeout(0);
    this.selectMenshanKey(menshanKeys[0]);
  }

  returnZero() {
    return 0;
  }

  selectMenshanKey(key: string) {
    const msbj = this.activeMsbj;
    const msbjInfo = this.activeMsbjInfo;
    if (msbj && msbjInfo) {
      for (const rectInfo of msbj.rectInfos) {
        const 选中模块 = msbjInfo.模块节点?.find((v) => v.层id === rectInfo.vid)?.选中模块;
        if (rectInfo.isBuju && !选中模块) {
          this.message.error("布局中存在未选中的模块");
          return;
        }
      }
    }
    this.activeMenshanKey = key;
    this.setActiveMsbj(this.activeMsbjInfo?.选中布局);
  }

  async setActiveMsbj(vid?: number) {
    this.showMokuais = false;
    const msbj = cloneDeep(this.msbjs.find((item) => item.vid === vid) || null);
    this.activeMsbj = msbj;
    this.activeRectInfo = null;
    const msbjInfo = this.activeMsbjInfo;
    if (msbjInfo) {
      if (!msbjInfo.模块节点) {
        msbjInfo.模块节点 = [];
      }
      for (const info of msbj?.rectInfos.filter((v) => v.isBuju) || []) {
        const node = msbjInfo.模块节点.find((v) => v.层id === info.vid);
        if (node) {
          node.层名字 = info.mingzi;
        } else {
          msbjInfo.模块节点.push({层id: info.vid, 层名字: info.mingzi, 可选模块: []});
        }
      }
    }

    await timeout(0);
    const rect = this.activeMsbj?.rectInfos?.filter((v) => v.isBuju)[0];
    const msbjRectsComponent = this.msbjRectsComponent;
    if (rect && msbjRectsComponent && msbjRectsComponent.rectInfos) {
      msbjRectsComponent.setCurrRectInfo(msbjRectsComponent.rectInfosRelative.filter((v) => v.raw.isBuju)[0]);
    }
    this.updateMokuaiInputInfo();
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
      infos[key].选中布局 = result[0].vid;
      this.setActiveMsbj(infos[key].选中布局);
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

  selectMokuai(mokuai: XhmrmsbjMokuai | null) {
    const mokuaiNode = this.activeMokuaiNode;
    const rectInfo = this.activeRectInfo;
    if (!mokuai || !mokuaiNode || !rectInfo) {
      return;
    }
    mokuaiNode.选中模块 = mokuaiNode.可选模块.find((v) => v.id === mokuai.id);
    this.updateMokuaiInputInfo();
  }

  updateMokuaiInputInfo() {
    const 选中模块 = this.activeMokuaiNode?.选中模块;
    if (!选中模块) {
      this.mokuaiInputInfos = [];
    } else {
      this.mokuaiInputInfos = [
        {type: "string", label: "总宽", model: {key: "totalWidth", data: 选中模块}},
        {type: "string", label: "总高", model: {key: "totalHeight", data: 选中模块}}
      ];
      for (const v of [...选中模块.gongshishuru, ...选中模块.xuanxiangshuru]) {
        this.mokuaiInputInfos.push({type: "string", label: v[0], model: {key: "1", data: v}});
      }
    }
  }

  getMokuaiTemplate(rectInfo: MsbjRectInfo | null): XhmrmsbjComponent["mokuaiTemplateType"] {
    const mokuaiId = this.activeMsbjInfo?.模块节点?.find((v) => v.层id === rectInfo?.raw.vid)?.选中模块?.id;
    const mokuai = this.mokuais.find((v) => v.id === mokuaiId);
    return {$implicit: mokuai || null, isActive: true};
  }

  async submit() {
    const {table, data: dataInfo} = this;
    if (!dataInfo) {
      return;
    }
    const errorMenshanKeys: string[] = [];
    for (const menshanKey in dataInfo.menshanbujuInfos) {
      const msbjInfo = dataInfo.menshanbujuInfos[menshanKey];
      if (msbjInfo.模块节点?.some((v) => !v.选中模块)) {
        errorMenshanKeys.push(menshanKey);
      }
    }
    if (errorMenshanKeys.length > 0) {
      this.message.error("布局中存在未选中的模块：" + errorMenshanKeys.join("，"));
      return;
    }
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

  setTabName(name: XhmrmsbjTabName) {
    this.activeTabName = name;
  }

  isMokuaiKexuan(mokuai: ZixuanpeijianTypesInfoItem) {
    const nodes = this.activeMsbjInfo?.模块节点 || [];
    return !!nodes.find((v) => v.可选模块.find((v2) => v2.id === mokuai.id));
  }

  async setKexuanmokuai() {
    const rectInfo = this.activeRectInfo;
    const mokuaiNode = this.activeMokuaiNode;
    if (!rectInfo || !mokuaiNode) {
      return;
    }
    const step1Data = cloneDeep(this.step1Data);
    for (const type1 in step1Data.typesInfo) {
      for (const type2 in step1Data.typesInfo[type1]) {
        step1Data.typesInfo[type1][type2].unique = true;
      }
    }
    const 模块: ZixuanpeijianMokuaiItem[] = [];
    for (const type1 in this.step1Data.typesInfo) {
      for (const type2 in this.step1Data.typesInfo[type1]) {
        const info = this.step1Data.typesInfo[type1][type2];
        if (mokuaiNode.可选模块.find((v) => v.id === info.id)) {
          模块.push({...info, type1, type2, totalWidth: "", totalHeight: "", cads: []});
        }
      }
    }
    const result = await openZixuanpeijianDialog(this.dialog, {
      data: {step: 1, step1Data, data: {模块}, checkEmpty: false, stepFixed: true}
    });
    if (result) {
      mokuaiNode.可选模块 = mokuaiNode.可选模块.filter((v) => result.模块.find((v2) => v.id === v2.id));
      for (const item of result.模块) {
        if (!mokuaiNode.可选模块.find((v) => v.id === item.id)) {
          mokuaiNode.可选模块.push({...item, 板材数据: {}});
        }
        const 选中模块 = mokuaiNode.选中模块;
        if (选中模块 && !mokuaiNode.可选模块.find((v) => v.id === 选中模块.id)) {
          delete mokuaiNode.选中模块;
        }
      }
    }
  }
}
