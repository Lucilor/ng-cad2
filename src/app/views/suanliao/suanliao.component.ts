import {Component, OnDestroy, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {CadData} from "@cad-viewer";
import {openDrawCadDialog} from "@components/dialogs/draw-cad/draw-cad.component";
import {
  calcCadItemZhankai,
  calcZxpj,
  CalcZxpjError,
  CalcZxpjOptions,
  getStep1Data,
  Step1Data,
  updateMokuaiItems,
  ZixuanpeijianCadItem,
  ZixuanpeijianInfo,
  ZixuanpeijianMokuaiItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";
import {timer} from "@src/app/app.common";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf, WindowMessageManager} from "@utils";
import {MsbjData, MsbjInfo} from "@views/msbj/msbj.types";
import {XhmrmsbjInfo} from "@views/xhmrmsbj/xhmrmsbj.types";

@Component({
  selector: "app-suanliao",
  templateUrl: "./suanliao.component.html",
  styleUrls: ["./suanliao.component.scss"]
})
export class SuanliaoComponent implements OnInit, OnDestroy {
  msbjs: MsbjInfo[] = [];
  step1Data?: Step1Data;
  wmm = new WindowMessageManager("算料", this, window.parent);

  constructor(
    private dialog: MatDialog,
    private message: MessageService,
    private calc: CalcService,
    private dataService: CadDataService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    const {token} = this.route.snapshot.queryParams;
    this.dataService.token = token;
    const menshanbujus = await this.dataService.queryMySql<MsbjData>({table: "p_menshanbuju"});
    this.msbjs = menshanbujus.map((item) => new MsbjInfo(item, "peizhishuju"));
    this.step1Data = await getStep1Data(this.dataService);
    this.wmm.postMessage("suanliaoReady");
  }

  ngOnDestroy() {
    this.wmm.destroy();
  }

  async suanliaoStart(params: SuanliaoInput): Promise<SuanliaoOutput> {
    const timerName = "算料";
    timer.start(timerName);
    const {materialResult, gongshi, inputResult, 型号选中门扇布局, 配件模块CAD, 门扇布局CAD, bujuNames, varNames} = params;
    const result: SuanliaoOutput = {
      action: "suanliaoEnd",
      data: {
        materialResult,
        配件模块CAD: [],
        门扇布局CAD: [],
        fulfilled: false
      }
    };
    const getCadItem = (data: any, info2?: Partial<ZixuanpeijianInfo>) => {
      const item: ZixuanpeijianCadItem = {
        data: new CadData(data),
        info: {
          ...info2,
          houtaiId: data.id,
          zhankai: [],
          calcZhankai: []
        }
      };
      calcCadItemZhankai(this.calc, materialResult, item);
      return item;
    };
    const mokuais: ZixuanpeijianMokuaiItem[] = [];
    for (const 门扇 of bujuNames) {
      if (!型号选中门扇布局[门扇]) {
        continue;
      }
      const {选中布局: 选中布局id, 模块节点, 模块大小输入} = 型号选中门扇布局[门扇];
      const 选中布局 = this.msbjs.find((v) => v.vid === 选中布局id);
      const formulas: ObjectOf<string> = {};
      if (选中布局 && 选中布局.peizhishuju.模块大小关系) {
        for (const v of Object.values<any>(选中布局.peizhishuju.模块大小关系.门扇调整)) {
          const 公式: string = v.公式;
          const [value, key] = 公式.split("=").map((v2) => v2.trim());
          if (value && key) {
            formulas[key] = value;
          }
        }
      }
      if (Array.isArray(模块节点)) {
        for (const node of 模块节点) {
          const {选中模块, 层名字, 层id} = node;
          if (选中模块) {
            if (模块大小输入) {
              for (const key in 模块大小输入) {
                const value = inputResult[key] > 0 ? inputResult[key] : 模块大小输入[key];
                模块大小输入[key] = value;
                if (key in gongshi) {
                  gongshi[key] = value;
                }
              }
              选中模块.模块大小输入 = 模块大小输入;
            } else {
              选中模块.模块大小输入 = {};
            }
            const keys = [层名字 + "总高", 层名字 + "总宽"];
            for (const key of keys) {
              if (formulas[key]) {
                选中模块.模块大小输入[key.slice(层名字.length)] = formulas[key];
              }
            }
            const info: Partial<ZixuanpeijianInfo> = {门扇名字: 门扇, 布局id: 选中布局id, 模块名字: 层名字, 层id};
            选中模块.info = info;
            mokuais.push(选中模块);
          }
        }
      }
    }

    if (this.step1Data) {
      updateMokuaiItems(mokuais, this.step1Data.typesInfo);
    }
    for (const mokuai of mokuais) {
      const {type1, type2} = mokuai;
      mokuai.shuruzongkuan = false;
      mokuai.shuruzonggao = false;
      mokuai.unique = false;
      mokuai.calcVars = {keys: Object.keys(mokuai.suanliaogongshi)};
      if (配件模块CAD[type1] && 配件模块CAD[type1][type2]) {
        mokuai.cads = 配件模块CAD[type1][type2].map((v) => getCadItem(v, mokuai.info));
      } else {
        mokuai.cads = [];
      }
    }

    const lingsans = [];
    for (const name of bujuNames) {
      const 选中布局 = 型号选中门扇布局[name]?.选中布局;
      for (const data of 门扇布局CAD) {
        const {布局id} = data.info;
        if (布局id === 选中布局) {
          lingsans.push(getCadItem(data, {门扇名字: name, 布局id: 选中布局}));
        }
      }
    }

    const calcVars: NonNullable<CalcZxpjOptions["calcVars"]> = {keys: varNames || []};
    const calcZxpjResult = await calcZxpj(this.dialog, this.message, this.calc, materialResult, mokuais, lingsans, {
      changeLinesLength: false,
      calcVars,
      gongshi,
      inputResult
    });
    if (!calcZxpjResult.fulfilled) {
      result.data.error = calcZxpjResult.error;
      timer.end(timerName, timerName);
      return result;
    }
    for (const mokuai of mokuais) {
      if (mokuai.calcVars?.result) {
        mokuai.suanliaogongshi = mokuai.calcVars?.result;
      }
      delete mokuai.calcVars;
    }
    const getCadItem2 = (data: ZixuanpeijianCadItem) => ({
      ...data,
      data: data.data.export()
    });
    result.data.配件模块CAD = mokuais.map((v) => ({...v, cads: v.cads.map(getCadItem2)}));
    result.data.门扇布局CAD = lingsans.map(getCadItem2);
    result.data.fulfilled = true;
    timer.end(timerName, timerName);
    return result;
  }

  async drawCads(data: {cads: any[]}) {
    await openDrawCadDialog(this.dialog, {data: {cads: data.cads.map((v) => new CadData(v)), collection: "cad"}});
  }

  updateMokuaiItemsStart(data: any) {
    const result = {action: "updateMokuaiItemsEnd", data: data.items};
    if (this.step1Data) {
      updateMokuaiItems(data.items, this.step1Data.typesInfo);
    }
    return result;
  }
}

export interface SuanliaoInput {
  materialResult: Formulas;
  gongshi: Formulas;
  inputResult: Formulas;
  型号选中门扇布局: ObjectOf<XhmrmsbjInfo>;
  配件模块CAD: ObjectOf<ObjectOf<any[]>>;
  门扇布局CAD: any[];
  bujuNames: string[];
  varNames: string[];
}

export interface SuanliaoOutput {
  action: "suanliaoEnd";
  data: {materialResult: Formulas; 配件模块CAD: any[]; 门扇布局CAD: any[]; fulfilled: boolean; error?: CalcZxpjError};
}
