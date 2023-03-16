import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {openMrbcjfzDialog} from "@components/dialogs/mrbcjfz-dialog/mrbcjfz-dialog.component";
import {openZixuanpeijianDialog} from "@components/dialogs/zixuanpeijian/zixuanpeijian.component";
import {
  getFromulasFromString,
  getMokuaiTitle,
  getStep1Data,
  isMokuaiItemEqual,
  Step1Data,
  ZixuanpeijianMokuaiItem,
  ZixuanpeijianTypesInfoItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {MsbjRectInfo} from "@components/msbj-rects/msbj-rects.types";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {BancaiList, TableDataBase, TableUpdateParams} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {CalcService} from "@services/calc.service";
import {session, setGlobal, timer} from "@src/app/app.common";
import {Formulas} from "@src/app/utils/calc";
import {Point, Rectangle, timeout, WindowMessageManager} from "@utils";
import {isMrbcjfzInfoEmpty, MrbcjfzInfo, MrbcjfzXinghao, MrbcjfzXinghaoInfo} from "@views/mrbcjfz/mrbcjfz.types";
import {MsbjData, MsbjInfo} from "@views/msbj/msbj.types";
import {cloneDeep, intersection, isEqual} from "lodash";
import {BehaviorSubject, filter, firstValueFrom} from "rxjs";
import {XhmrmsbjData, XhmrmsbjInfo, XhmrmsbjTableData, XhmrmsbjTabName, xhmrmsbjTabNames} from "./xhmrmsbj.types";

@Component({
  selector: "app-xhmrmsbj",
  templateUrl: "./xhmrmsbj.component.html",
  styleUrls: ["./xhmrmsbj.component.scss"]
})
export class XhmrmsbjComponent implements OnInit, OnDestroy {
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
  materialResult: Formulas = {};
  mokuaidaxiaoResult: Formulas = {};
  wmm = new WindowMessageManager("门扇模块", this, window.parent);
  xiaoguotuLock$ = new BehaviorSubject(false);
  private _xiaoguotuDisabledKey = "xhmrmsbjXiaoguotuDisabled";
  private _xiaoguotuDisabled = false;
  get xiaoguotuDisabled() {
    return this._xiaoguotuDisabled;
  }
  set xiaoguotuDisabled(value) {
    this._xiaoguotuDisabled = value;
    session.save(this._xiaoguotuDisabledKey, value);
  }
  production = environment.production;
  @ViewChild(MsbjRectsComponent) msbjRectsComponent?: MsbjRectsComponent;
  @ViewChild("xiaoguotuContainer", {read: ElementRef}) xiaoguotuContainer?: ElementRef<HTMLDivElement>;

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
    } else if (token) {
      this.isFromOrder = true;
      this.token = token;
      this.dataService.token = token;
    }
    this.fenleis = await this.dataService.queryMySql<TableDataBase>({table: "p_gongnengfenlei", fields: ["vid", "mingzi"]});
    const menshanbujus = await this.dataService.queryMySql<MsbjData>({table: "p_menshanbuju"});
    this.msbjs = menshanbujus.map((item) => new MsbjInfo(item, "peizhishuju"));
    const response = await this.dataService.post<BancaiList[]>("ngcad/getBancaiList");
    this.bancaiList = this.dataService.getResponseData(response) || [];
    if (!this.isFromOrder) {
      this.data = this.tableData ? new XhmrmsbjData(this.tableData, this.menshanKeys, this.step1Data.typesInfo, this.msbjs) : null;
      const xinghaos = await this.dataService.queryMySql<MrbcjfzXinghao>({
        table: "p_xinghao",
        filter: {where: {vid: this.tableData?.xinghao}}
      });
      this.xinghao = xinghaos[0] ? new MrbcjfzXinghaoInfo(xinghaos[0]) : null;
    }
    await timeout(0);
    this._xiaoguotuDisabled = !!session.load(this._xiaoguotuDisabledKey);
    if (this.isFromOrder) {
      this.wmm.postMessage("requestData");
    } else {
      await this.selectMenshanKey(this.menshanKeys[0]);
    }
  }

  ngOnDestroy() {
    this.wmm.destroy();
  }

  async requestData(data: any) {
    const {型号选中门扇布局, 型号选中板材, materialResult, menshanKeys, 铰扇跟随锁扇} = data;
    this.data = new XhmrmsbjData(
      {vid: 1, mingzi: "1", peizhishuju: JSON.stringify(型号选中门扇布局), jiaoshanbujuhesuoshanxiangtong: 铰扇跟随锁扇 ? 1 : 0},
      menshanKeys,
      this.step1Data.typesInfo,
      this.msbjs
    );
    this.materialResult = materialResult;
    this.menshanKeys = menshanKeys;
    this.xinghao = new MrbcjfzXinghaoInfo({vid: 1, mingzi: materialResult.型号, morenbancai: JSON.stringify(型号选中板材)});
    await this.selectMenshanKey(this.activeMenshanKey || this.menshanKeys[0]);
    const 模块大小关系 = this.activeMsbjInfo?.选中布局数据?.模块大小关系;
    if (模块大小关系) {
      this.wmm.postMessage("calcGongshi2Start", {config: 模块大小关系});
      const result = await this.wmm.waitForMessage("calcGongshi2End");
      this.mokuaidaxiaoResult = result.values;
    }
  }

  submitData() {
    const result = {action: "submitData", data: {} as any};
    const data = this.data;
    if (data) {
      if (data.铰扇跟随锁扇) {
        for (const key in data.menshanbujuInfos) {
          if (key.includes("铰扇")) {
            data.menshanbujuInfos[key] = cloneDeep(data.menshanbujuInfos[key.replace("铰扇", "锁扇")]);
          }
        }
      }
      result.data = {
        型号选中门扇布局: data.menshanbujuInfos,
        铰扇跟随锁扇: data.铰扇跟随锁扇,
        门扇布局: this.msbjs
      };
    }
    return result;
  }

  保存模块大小(data: any) {
    if (this.activeMsbjInfo) {
      this.activeMsbjInfo.模块大小输入 = data.inputValues;
      this.mokuaidaxiaoResult = data.values;
      this.updateMokuaidaxiaoResult();
      this.生成效果图();
    }
  }

  returnZero() {
    return 0;
  }

  async selectMenshanKey(key: string) {
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
    await this.setActiveMsbj(this.activeMsbjInfo);
  }

  async setActiveMsbj(info?: XhmrmsbjInfo) {
    this.showMokuais = false;
    const vid = info?.选中布局数据?.vid;
    const msbj = cloneDeep(this.msbjs.find((item) => item.vid === vid) || null);
    this.activeMsbj = msbj;
    this.activeRectInfo = null;
    const msbjInfo = this.activeMsbjInfo;
    await timeout(0);
    if (msbjInfo) {
      if (!msbjInfo.模块节点) {
        msbjInfo.模块节点 = [];
      }
      const rectInfos = this.msbjRectsComponent?.rectInfosAbsolute || [];
      msbjInfo.模块节点 = msbjInfo.模块节点.filter((v) => rectInfos.find((rectInfo) => rectInfo.raw.isBuju && rectInfo.raw.vid === v.层id));
      for (const rectInfo of rectInfos) {
        if (rectInfo.raw.isBuju) {
          const node = msbjInfo.模块节点.find((v) => v.层id === rectInfo.raw.vid);
          if (node) {
            node.层名字 = rectInfo.name;
          } else {
            msbjInfo.模块节点.push({层id: rectInfo.raw.vid, 层名字: rectInfo.name, 可选模块: []});
          }
        }
      }
    }

    await this.updateMokuaidaxiaoResult();
    await this.生成效果图();
  }

  async updateMokuaidaxiaoResult() {
    const msbj = this.activeMsbj;
    if (!this.isFromOrder || !msbj) {
      this.updateMokuaiInputInfo();
      return;
    }
    const vars = {...this.materialResult, ...this.activeMsbjInfo?.模块大小输入};
    const config = msbj.peizhishuju.模块大小关系 || {};
    if (!config.门扇调整) {
      config.门扇调整 = Object.values(config)[0];
    }
    if (!config.配置) {
      config.配置 = {};
    }
    if (config.门扇调整) {
      for (const k in config.门扇调整) {
        const item = config.门扇调整[k];
        for (const k2 in item.初始值) {
          if (this.activeMenshanKey && k2.includes("当前扇")) {
            const k3 = k2.replaceAll("当前扇", this.activeMenshanKey);
            if (!config.配置.修改变量) {
              config.配置.修改变量 = {};
            }
            config.配置.修改变量[k2] = vars[k3];
            if (!config.变量别名) {
              item.变量别名 = {};
            }
            item.变量别名[k2] = k3;
          } else {
            if (k2 in vars) {
              item.初始值[k2] = vars[k2];
            }
          }
        }
      }
    }
    this.updateMokuaiInputInfo();
  }

  async setMsbj() {
    const infos = this.data?.menshanbujuInfos;
    const menshanweizhi = this.activeMenshanKey;
    if (!menshanweizhi || !infos) {
      return;
    }
    const {选中布局数据} = infos[menshanweizhi];
    const checkedVids: number[] = [];
    if (选中布局数据?.vid) {
      checkedVids.push(选中布局数据.vid);
    }
    const result = await openCadOptionsDialog(this.dialog, {
      data: {name: "p_menshanbuju", filter: {guanlianCN: {menshanweizhi}}, checkedVids, multi: false}
    });
    if (result?.[0]) {
      const msbj = this.msbjs.find((v) => v.vid === result[0].vid);
      if (msbj) {
        infos[menshanweizhi].选中布局 = msbj.vid;
        infos[menshanweizhi].选中布局数据 = {
          vid: msbj.vid,
          name: msbj.name,
          模块大小关系: msbj.peizhishuju.模块大小关系
        };
        this.setActiveMsbj(infos[menshanweizhi]);
      }
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
    this.生成效果图();
  }

  updateMokuaiInputInfo() {
    const 选中模块 = this.activeMokuaiNode?.选中模块;
    this.mokuaiInputInfos = [];
    if (选中模块) {
      const node = this.activeMokuaiNode;
      if (node) {
        const name = node.层名字;
        const keyMap = {总宽: "totalWidth", 总高: "totalHeight"} as const;
        for (const key in keyMap) {
          const key3 = name + key;
          this.mokuaiInputInfos.push({type: "string", label: key, model: {key: key3, data: () => this.mokuaidaxiaoResult}, readonly: true});
        }
      }
      const arr = 选中模块.gongshishuru.concat(选中模块.xuanxiangshuru);
      for (const v of arr) {
        if (!v[1] && v[0] in this.materialResult) {
          const value = Number(this.materialResult[v[0]]);
          if (!isNaN(value)) {
            v[1] = value.toString();
          }
        }
        this.mokuaiInputInfos.push({
          type: "string",
          label: v[0],
          model: {key: "1", data: v},
          onChange: async () => {
            const {data, activeMenshanKey} = this;
            if (data && activeMenshanKey) {
              for (const key in data.menshanbujuInfos) {
                if (key !== activeMenshanKey) {
                  for (const node2 of data.menshanbujuInfos[key].模块节点 || []) {
                    const 选中模块2 = node2.选中模块;
                    if (选中模块2) {
                      const arr2 = 选中模块2.gongshishuru.concat(选中模块2.xuanxiangshuru);
                      for (const v2 of arr2) {
                        if (v2[0] === v[0]) {
                          v2[1] = v[1];
                        }
                      }
                    }
                  }
                }
              }
            }
            await this.生成效果图();
          }
        });
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
    const errorMenshanKeys = new Set<string>();
    const varKeysXinghao = Object.keys(getFromulasFromString(this.xinghao?.raw.gongshishuru));
    const duplicates1: {mokuai: ZixuanpeijianMokuaiItem; keys: string[]}[] = [];
    const duplicates2: {mokuais: ZixuanpeijianMokuaiItem[]; keys: string[]}[] = [];
    const msbjInfos: {menshanKey: string; msbjInfo: XhmrmsbjInfo}[] = [];
    for (const menshanKey in dataInfo.menshanbujuInfos) {
      msbjInfos.push({menshanKey, msbjInfo: dataInfo.menshanbujuInfos[menshanKey]});
    }
    for (let i = 0; i < msbjInfos.length; i++) {
      const {menshanKey, msbjInfo} = msbjInfos[i];
      for (const node of msbjInfo.模块节点 || []) {
        if (!node.选中模块) {
          if (!dataInfo.铰扇跟随锁扇 || !menshanKey.includes("锁扇")) {
            errorMenshanKeys.add(menshanKey);
          }
        }
        for (const mokuai of node.可选模块) {
          const varKeysMokuai = mokuai.shuchubianliang;
          const keys1 = intersection(varKeysXinghao, varKeysMokuai);
          if (keys1.length > 0) {
            duplicates1.push({mokuai, keys: keys1});
          }
          for (let j = i + 1; j < msbjInfos.length; j++) {
            for (const node2 of msbjInfos[i].msbjInfo.模块节点 || []) {
              for (const mokuai2 of node2.可选模块) {
                if (isMokuaiItemEqual(mokuai, mokuai2)) {
                  continue;
                }
                const varKeysMokuai2 = mokuai2.shuchubianliang;
                const keys2 = intersection(varKeysMokuai, varKeysMokuai2);
                if (keys2.length > 0) {
                  duplicates2.push({mokuais: [mokuai, mokuai2], keys: keys2});
                }
              }
            }
          }
        }
      }
    }
    if (duplicates1.length > 0) {
      const list = duplicates1.map(({mokuai, keys}) => `${getMokuaiTitle(mokuai)}: ${keys.join("，")}`);
      await this.message.error("模块输出变量与型号公式输入重复", list);
      return;
    }
    if (errorMenshanKeys.size > 0) {
      await this.message.error("布局中存在未选中的模块", Array.from(errorMenshanKeys).join("，"));
      return;
    }
    const tableData: TableUpdateParams<MsbjData>["tableData"] = dataInfo.export();
    delete tableData.mingzi;
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
    const node = this.activeMokuaiNode;
    return !!node?.可选模块.find((v2) => v2.id === mokuai.id);
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

  async setBancaixuanze(item: MrbcjfzInfo, value: string) {
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
    await this.生成效果图();
  }

  getMsbj(id: number) {
    return this.msbjs.find((v) => v.vid === id);
  }

  async editMokuaidaxiao() {
    const msbjInfo = this.activeMsbjInfo;
    if (!msbjInfo) {
      return;
    }
    const 选中布局数据 = msbjInfo.选中布局数据;
    if (!选中布局数据) {
      return;
    }
    if (this.isFromOrder) {
      const data = {config: 选中布局数据.模块大小关系};
      this.wmm.postMessage("编辑模块大小", data);
      return;
    } else {
      const data = await this.message.json(选中布局数据.模块大小关系);
      if (data) {
        选中布局数据.模块大小关系 = data;
      }
    }
  }

  async 生成效果图() {
    if (!this.isFromOrder) {
      return;
    }
    const container = this.xiaoguotuContainer?.nativeElement;
    if (!container) {
      return;
    }
    if (this.xiaoguotuLock$.value) {
      await firstValueFrom(this.xiaoguotuLock$.pipe(filter((v) => !v)));
    }
    this.xiaoguotuLock$.next(true);
    const timerName = "生成效果图";
    timer.start(timerName);
    container.innerHTML = "";
    container.style.transform = "";
    container.style.opacity = "0";
    await timeout(0);
    this.wmm.postMessage("获取效果图", {...this.submitData().data, xiaoguotuDisabled: this.xiaoguotuDisabled});
    const data = await this.wmm.waitForMessage("返回效果图");
    const items = data[this.activeMenshanKey || ""] || [];
    const rectContainer0 = container.getBoundingClientRect();
    const rectContainer = new Rectangle([rectContainer0.left, rectContainer0.top], [rectContainer0.right, rectContainer0.bottom]);
    const padding = this.msbjRectsComponent?.padding || [0, 0, 0, 0];
    rectContainer.min.add(new Point(padding[3], padding[0]));
    rectContainer.max.sub(new Point(padding[1], padding[2]));
    const els: HTMLDivElement[] = [];
    for (const item of items) {
      let div = document.createElement("div");
      div.innerHTML = item;
      div = div.firstElementChild as HTMLDivElement;
      container.appendChild(div);
      els.push(div);
    }
    await timeout(0);
    const rect = Rectangle.min;
    for (const el of els) {
      const {top, right, bottom, left} = el.getBoundingClientRect();
      rect.expandByPoint(new Point(left, top));
      rect.expandByPoint(new Point(right, bottom));
    }
    const scaleX = rectContainer.width / rect.width;
    const scaleY = rectContainer.height / rect.height;
    const scale = Math.min(scaleX, scaleY);
    const dx = (rectContainer.left - rect.left) * scale + (rectContainer.width - rect.width * scale) / 2;
    const dy = (rectContainer.bottom - rect.bottom) * scale + (rectContainer.height - rect.height * scale) / 2;
    container.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    container.style.opacity = "1";
    timer.end(timerName, timerName);
    this.xiaoguotuLock$.next(false);
  }
}
