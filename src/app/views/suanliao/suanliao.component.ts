import {Component, HostListener} from "@angular/core";
import {CadData} from "@cad-viewer";
import {calcCadItemZhankai, calcZxpj} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";
import {timeout} from "@utils";

@Component({
  selector: "app-suanliao",
  templateUrl: "./suanliao.component.html",
  styleUrls: ["./suanliao.component.scss"]
})
export class SuanliaoComponent {
  messageType = "算料";

  constructor(private message: MessageService, private calc: CalcService) {}

  @HostListener("window:message", ["$event"])
  async onMessage(event: MessageEvent) {
    const data = event.data;
    const messageType = this.messageType;
    if (!data || typeof data !== "object" || data.type !== messageType) {
      return;
    }
    switch (data.action) {
      case "开始算料":
        this.suanliao(data.data);
        break;
      default:
        break;
    }
  }

  async suanliao(data: any) {
    const {materialResult, 配件模块CAD: mokuais, 门扇布局CAD: lingsans} = data;
    const fractionDigits = 1;
    const setCadItem1 = (item: any) => {
      calcCadItemZhankai(this.calc, materialResult, item, fractionDigits);
      item.data = new CadData(item.data);
    };
    const setCadItem2 = (item: any) => {
      item.data = item.data.export();
    };
    mokuais.forEach((mokuai: any) => {
      mokuai.cads.forEach(setCadItem1);
    });
    lingsans.forEach(setCadItem1);
    calcZxpj(this.message, this.calc, materialResult, mokuais, lingsans, fractionDigits);
    mokuais.forEach((mokuai: any) => {
      mokuai.cads.forEach(setCadItem2);
    });
    lingsans.forEach(setCadItem2);
    await timeout(0);
    if (this.message.openedDialogs.length > 0) {
      await new Promise<void>((resolve) => {
        this.message.close$.subscribe(() => {
          if (this.message.openedDialogs.length < 1) {
            resolve();
          }
        });
      });
    }
    window.parent.postMessage({type: this.messageType, action: "结束算料", data: data.data}, "*");
  }
}
