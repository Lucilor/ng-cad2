import {Component, HostListener, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadData} from "@cad-viewer";
import {
  calcCadItemZhankai,
  calcZxpj,
  getMokuaiTitle,
  ZixuanpeijianCadItem,
  ZixuanpeijianMokuaiItem
} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";
import {Formulas} from "@src/app/utils/calc";
import {ObjectOf, timeout} from "@utils";
import {MsbjData, MsbjInfo} from "@views/msbj/msbj.types";
import {XhmrmsbjInfo} from "@views/xhmrmsbj/xhmrmsbj.types";
import {isEmpty} from "lodash";

@Component({
  selector: "app-suanliao",
  templateUrl: "./suanliao.component.html",
  styleUrls: ["./suanliao.component.scss"]
})
export class SuanliaoComponent implements OnInit {
  messageType = "算料";
  msbjs: MsbjInfo[] = [];

  constructor(
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
  }

  @HostListener("window:message", ["$event"])
  async onMessage(event: MessageEvent) {
    const data = event.data;
    const messageType = this.messageType;
    if (!data || typeof data !== "object" || data.type !== messageType) {
      return;
    }
    switch (data.action) {
      case "开始算料":
        {
          const result = await this.suanliao(data.data);
          window.parent.postMessage({type: this.messageType, action: "结束算料", data: result}, "*");
        }
        break;
      default:
        break;
    }
  }

  async suanliao(params: {
    materialResult: Formulas;
    gongshi: Formulas;
    型号选中门扇布局: ObjectOf<XhmrmsbjInfo>;
    配件模块CAD: ObjectOf<ObjectOf<any[]>>;
    门扇布局CAD: any[];
    bujuNames: string[];
  }) {
    const {materialResult, gongshi, 型号选中门扇布局, 配件模块CAD, 门扇布局CAD, bujuNames} = params;
    const fractionDigits = 1;
    const getCadItem = (data: any) => {
      const item: ZixuanpeijianCadItem = {
        data: new CadData(data),
        info: {
          houtaiId: data.id,
          zhankai: [],
          calcZhankai: []
        }
      };
      calcCadItemZhankai(this.calc, materialResult, item, fractionDigits);
      return item;
    };
    const mokuais: ZixuanpeijianMokuaiItem[] = [];
    for (const 门扇 in 型号选中门扇布局) {
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
          const {选中模块, 层名字} = node;
          if (选中模块) {
            选中模块.shuruzongkuan = false;
            选中模块.shuruzonggao = false;
            选中模块.unique = false;
            mokuais.push(选中模块);
            if (模块大小输入) {
              for (const key in 模块大小输入) {
                const value = 模块大小输入[key];
                选中模块.suanliaogongshi[key] = value;
                if (key in gongshi) {
                  gongshi[key] = value;
                }
              }
            }
            const keys = [层名字 + "总高", 层名字 + "总宽"];
            for (const key of keys) {
              if (formulas[key]) {
                选中模块.suanliaogongshi[key.slice(层名字.length)] = formulas[key];
              }
            }
          }
        }
      }
    }

    for (const mokuai of mokuais) {
      const {type1, type2} = mokuai;
      if (配件模块CAD[type1] && 配件模块CAD[type1][type2]) {
        mokuai.cads = 配件模块CAD[type1][type2].map(getCadItem);
      } else {
        mokuai.cads = [];
      }
    }

    const 选中布局ids = [];
    for (const name of bujuNames) {
      if ((型号选中门扇布局[name]?.选中布局 || 0) > 0) {
        选中布局ids.push(型号选中门扇布局[name].选中布局);
      }
    }
    const lingsans = [];
    for (const data of 门扇布局CAD) {
      if (选中布局ids.includes(data.info.布局id)) {
        lingsans.push(getCadItem(data));
      }
    }

    const gongshiResult = this.calc.calcFormulas(gongshi, materialResult, {title: "计算算料公式"});
    if (!(await this.waitForDialogClose()) || !gongshiResult || !isEmpty(gongshiResult.error)) {
      return null;
    }
    Object.assign(materialResult, gongshiResult.succeedTrim);
    calcZxpj(this.message, this.calc, materialResult, mokuais, lingsans, fractionDigits);
    for (const mokuai of mokuais) {
      const title = `计算${getMokuaiTitle(mokuai)}算料公式`;
      const formulas = {...mokuai.suanliaogongshi};
      for (const key in mokuai.suanliaogongshi) {
        if (key in materialResult) {
          formulas[key] = materialResult[key];
        }
      }
      const calcResult = this.calc.calcFormulas(formulas, materialResult, {title});
      if (!(await this.waitForDialogClose()) || !calcResult || !isEmpty(calcResult.error)) {
        return null;
      }
      mokuai.suanliaogongshi = calcResult.succeedTrim;
    }
    await timeout(0);
    if (!(await this.waitForDialogClose())) {
      return null;
    }
    const getCadItem2 = (data: ZixuanpeijianCadItem) => ({
      ...data,
      data: data.data.export()
    });
    const result = {
      materialResult,
      配件模块CAD: mokuais.map((v) => ({...v, cads: v.cads.map(getCadItem2)})),
      门扇布局CAD: lingsans.map(getCadItem2)
    };
    return result;
  }

  async waitForDialogClose() {
    if (this.message.openedDialogs.length < 1) {
      return true;
    }

    await new Promise<void>((resolve) => {
      this.message.close$.subscribe(() => {
        if (this.message.openedDialogs.length < 1) {
          resolve();
        }
      });
    });
    return false;
  }
}
