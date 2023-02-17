import {Component, HostListener, OnInit, ViewChild} from "@angular/core";
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
import {CalcService} from "@services/calc.service";
import {setGlobal} from "@src/app/app.common";
import {Formulas} from "@src/app/utils/calc";
import {timeout} from "@utils";
import {isMrbcjfzInfoEmpty, MrbcjfzInfo, MrbcjfzXinghao, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.types";
import {MsbjData, MsbjInfo} from "@views/msbj/msbj.types";
import {cloneDeep, isEqual} from "lodash";
import {XhmrmsbjData, XhmrmsbjTableData, XhmrmsbjTabName, xhmrmsbjTabNames} from "./xhmrmsbj.types";

@Component({
  selector: "app-xhmrmsbj",
  templateUrl: "./xhmrmsbj.component.html",
  styleUrls: ["./xhmrmsbj.component.scss"]
})
export class XhmrmsbjComponent implements OnInit {
  table = "";
  id = "";
  isFromOrder = false;
  token = "";
  tableData: XhmrmsbjTableData | null = null;
  data: XhmrmsbjData | null = null;
  fenleis: TableDataBase[] = [];
  msbjs: MsbjInfo[] = [];
  step1Data: Step1Data = {prefix: "", options: {}, typesInfo: {}};
  mokuais: ZixuanpeijianMokuaiItem[] = [];
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
  get activeMorenbancai() {
    return this.activeMokuaiNode?.选中模块?.morenbancai || {};
  }
  getMokuaiTitle = getMokuaiTitle;
  showMokuais = false;
  mokuaiTemplateType!: {$implicit: ZixuanpeijianMokuaiItem | null; isActive?: boolean};
  tabNames = xhmrmsbjTabNames;
  activeTabName: XhmrmsbjTabName = "门扇模块";
  mokuaiInputInfos: InputInfo[] = [];
  isMrbcjfzInfoEmpty = isMrbcjfzInfoEmpty;
  menshanKeys = ["锁扇正面", "锁扇背面", "铰扇正面", "铰扇背面", "小扇正面", "小扇背面"];
  messageType = "门扇模块";
  materialResult: Formulas = {};
  mokuaidaxiaoResult: Formulas = {};
  @ViewChild(MsbjRectsComponent) msbjRectsComponent?: MsbjRectsComponent;

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private dialog: MatDialog,
    private spinner: SpinnerService,
    private message: MessageService,
    private calc: CalcService
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
          this.mokuais.push({...info, type1, type2, totalWidth: "", totalHeight: "", cads: []});
        }
      }
    }

    const {table, id, token} = this.route.snapshot.queryParams;
    if (table && id) {
      this.table = table;
      this.id = id;
      this.isFromOrder = false;
      const records = await this.dataService.queryMySql<XhmrmsbjTableData>({table, filter: {where: {vid: id}}});
      this.tableData = records?.[0] || null;
      this.data = this.tableData ? new XhmrmsbjData(this.tableData, this.menshanKeys, this.step1Data.typesInfo) : null;
      const xinghaos = await this.dataService.queryMySql<MrbcjfzXinghao>({
        table: "p_xinghao",
        filter: {where: {vid: this.tableData?.xinghao}}
      });
      this.xinghao = xinghaos[0] ? new MrbcjfzXinghaoInfo(xinghaos[0]) : null;
    } else if (token) {
      this.isFromOrder = true;
      this.token = token;
      this.dataService.token = token;
      window.parent.postMessage({type: this.messageType, action: "requestData"}, "*");
      await this.dataService.queryMySql<MsbjData>({table: "p_menshanbuju"});
    }
    this.fenleis = await this.dataService.queryMySql<TableDataBase>({table: "p_gongnengfenlei", fields: ["vid", "mingzi"]});
    const menshanbujus = await this.dataService.queryMySql<MsbjData>({table: "p_menshanbuju"});
    this.msbjs = menshanbujus.map((item) => new MsbjInfo(item, "peizhishuju"));
    const response = await this.dataService.post<BancaiList[]>("ngcad/getBancaiList");
    this.bancaiList = response?.data || [];

    await timeout(0);
    this.selectMenshanKey(this.menshanKeys[0]);
  }

  @HostListener("window:message", ["$event"])
  async onMessage(event: MessageEvent) {
    const data = event.data;
    const messageType = this.messageType;
    if (!data || typeof data !== "object" || data.type !== messageType) {
      return;
    }
    switch (data.action) {
      case "requestData":
        {
          const {型号选中门扇布局, 型号选中板材, materialResult, menshanKeys} = data.data;
          this.data = new XhmrmsbjData(
            {vid: 1, mingzi: "1", peizhishuju: JSON.stringify(型号选中门扇布局)},
            menshanKeys,
            this.step1Data.typesInfo
          );
          this.materialResult = materialResult;
          this.xinghao = new MrbcjfzXinghaoInfo({vid: 1, mingzi: materialResult.型号, morenbancai: JSON.stringify(型号选中板材)});
          if (this.activeMenshanKey) {
            this.selectMenshanKey(this.activeMenshanKey);
          }
        }
        break;
      case "submitData":
        window.parent.postMessage(
          {
            type: messageType,
            action: "submitData",
            data: {
              型号选中门扇布局: this.data?.menshanbujuInfos,
              门扇布局: this.msbjs
            }
          },
          "*"
        );
        break;
      case "保存模块大小":
        if (this.activeMsbjInfo) {
          this.activeMsbjInfo.模块大小输入 = data.data.values;
          this.updateMokuaidaxiaoResult();
        }
        break;
      default:
        break;
    }
  }

  returnZero() {
    return 0;
  }

  selectMenshanKey(key: string) {
    const msbj = this.activeMsbj;
    const msbjInfo = this.activeMsbjInfo;
    if (msbj && msbjInfo) {
      for (const rectInfo of msbj.peizhishuju.模块节点) {
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
      for (const info of msbj?.peizhishuju?.模块节点.filter((v) => v.isBuju) || []) {
        const node = msbjInfo.模块节点.find((v) => v.层id === info.vid);
        if (node) {
          node.层名字 = info.mingzi;
        } else {
          msbjInfo.模块节点.push({层id: info.vid, 层名字: info.mingzi, 可选模块: []});
        }
      }
    }

    this.updateMokuaidaxiaoResult();
  }

  async updateMokuaidaxiaoResult() {
    const msbj = this.activeMsbj;
    if (!this.isFromOrder || !msbj) {
      this.updateMokuaiInputInfo();
      return;
    }
    this.mokuaidaxiaoResult = {};
    const vars = {...this.materialResult, ...this.activeMsbjInfo?.模块大小输入};
    const config = msbj.peizhishuju.模块大小关系 || {};
    if (!config.门扇调整) {
      config.门扇调整 = Object.values(config)[0];
    }
    if (config.门扇调整) {
      for (const k in config.门扇调整) {
        const item = config.门扇调整[k];
        const arr = item.公式.split("=").map((v: any) => v.trim());
        const calcResult = await this.calc.calcExpression(arr[0], vars);
        if (calcResult !== null) {
          vars[arr[1]] = calcResult;
          this.mokuaidaxiaoResult[arr[1]] = calcResult;
        }
        for (const k2 in item.初始值) {
          if (k2 in vars) {
            item.初始值[k2] = vars[k2];
          }
        }
      }
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
    const menshanweizhiArr: string[] = [];
    if (key.includes("正面")) {
      menshanweizhiArr.push("门扇正面");
    }
    if (key.includes("反面")) {
      menshanweizhiArr.push("门扇反面");
    }
    const menshanweizhi = menshanweizhiArr.join("*");
    const result = await openCadOptionsDialog(this.dialog, {
      data: {name: "p_menshanbuju", filter: {guanlianCN: {menshanweizhi}}, checkedVids, multi: false}
    });
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

  generateRectsEnd() {
    const rect = this.activeMsbj?.peizhishuju?.模块节点?.filter((v) => v.isBuju)[0];
    const msbjRectsComponent = this.msbjRectsComponent;
    if (rect && msbjRectsComponent && msbjRectsComponent.rectInfos) {
      msbjRectsComponent.setCurrRectInfo(msbjRectsComponent.rectInfosRelative.filter((v) => v.raw.isBuju)[0]);
    }
    this.updateMokuaiInputInfo();
  }

  selectMokuai(mokuai: ZixuanpeijianMokuaiItem | null) {
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
    this.mokuaiInputInfos = [];
    if (选中模块) {
      const node = this.activeMokuaiNode;
      const mokuaidaxiaoResult = this.mokuaidaxiaoResult;
      if (node) {
        const name = node.层名字;
        const keyMap = {总宽: "totalWidth", 总高: "totalHeight"} as const;
        for (const key in keyMap) {
          const key3 = name + key;
          let inputValue = "";
          if (key3 in mokuaidaxiaoResult) {
            inputValue = String(mokuaidaxiaoResult[key3]);
          }
          this.mokuaiInputInfos.push({type: "string", label: key, value: inputValue, readonly: true});
        }
      }
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
    const {table, data: dataInfo, isFromOrder} = this;
    if (!dataInfo || isFromOrder) {
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
    if (!this.xinghao || this.isFromOrder) {
      return;
    }
    const result = await openMrbcjfzDialog(this.dialog, {data: {id: this.xinghao.raw.vid, table: "p_xinghao"}});
    if (result) {
      this.xinghao = result;
    }
  }

  async setTabName(name: XhmrmsbjTabName) {
    this.activeTabName = name;
    await timeout(0);
    this.msbjRectsComponent?.generateRects();
  }

  isMokuaiKexuan(mokuai: ZixuanpeijianTypesInfoItem) {
    const nodes = this.activeMsbjInfo?.模块节点 || [];
    return !!nodes.find((v) => v.可选模块.find((v2) => v2.id === mokuai.id));
  }

  isMokuaiActive(mokuai: ZixuanpeijianTypesInfoItem) {
    return this.activeMokuaiNode?.选中模块?.id === mokuai.id;
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
          mokuaiNode.可选模块.push(item);
        }
        const 选中模块 = mokuaiNode.选中模块;
        if (选中模块 && !mokuaiNode.可选模块.find((v) => v.id === 选中模块.id)) {
          delete mokuaiNode.选中模块;
        }
      }
    }
  }

  getBancaixuanze(item: MrbcjfzInfo) {
    if (this.isFromOrder) {
      return item.选中板材分组;
    } else {
      return item.默认对应板材分组;
    }
  }

  setBancaixuanze(item: MrbcjfzInfo, value: string) {
    if (this.isFromOrder) {
      item.选中板材分组 = value;
      item.选中板材 = "";
      item.选中材料 = "";
      item.选中板材厚度 = "";
    } else {
      item.默认对应板材分组 = value;
      item.默认开料板材 = "";
      item.默认开料材料 = "";
      item.默认开料板材厚度 = "";
    }
  }

  getMsbj(id: number) {
    return this.msbjs.find((v) => v.vid === id);
  }

  async editMokuaidaxiao() {
    const msbj = this.activeMsbj;
    if (!msbj) {
      return;
    }
    if (this.isFromOrder) {
      const data = {config: msbj.peizhishuju.模块大小关系};
      window.parent.postMessage({type: this.messageType, action: "编辑模块大小", data}, "*");
      return;
    } else {
      const data = await this.message.json(msbj.peizhishuju.模块大小关系);
      if (data) {
        msbj.peizhishuju.模块大小关系 = data;
        const table = "p_menshanbuju";
        const tableData: TableUpdateParams<MsbjData>["tableData"] = {vid: msbj.vid};
        tableData.peizhishuju = JSON.stringify(msbj.peizhishuju);
        this.spinner.show(this.spinner.defaultLoaderId);
        await this.dataService.tableUpdate({table, tableData});
        this.spinner.hide(this.spinner.defaultLoaderId);
      }
    }
  }
}
