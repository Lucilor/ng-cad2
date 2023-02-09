import {Component, HostListener} from "@angular/core";
import {CadData} from "@cad-viewer";
import {calcZxpj} from "@components/dialogs/zixuanpeijian/zixuanpeijian.types";
import {MessageService} from "@modules/message/services/message.service";
import {CalcService} from "@services/calc.service";

@Component({
  selector: "app-suanliao",
  templateUrl: "./suanliao.component.html",
  styleUrls: ["./suanliao.component.scss"]
})
export class SuanliaoComponent {
  constructor(private message: MessageService, private calc: CalcService) {}

  @HostListener("window:message", ["$event"])
  onMessage(event: MessageEvent) {
    const data = event.data;
    if (!data || typeof data !== "object" || data.type !== "算料") {
      return;
    }
    switch (data.action) {
      case "开始算料":
        {
          const {materialResult, mokuais} = data.data;
          mokuais.forEach((mokuai: any) => {
            mokuai.cads = mokuai.cads.map((cad: any) => new CadData(cad));
          });
          calcZxpj(this.message, this.calc, materialResult, mokuais, [], 1);
          mokuais.forEach((mokuai: any) => {
            mokuai.cads = mokuai.cads.map((cad: any) => cad.export());
          });
          window.parent.postMessage({type: "算料", action: "结束算料", data: {materialResult, mokuais}}, "*");
        }
        break;
      default:
        break;
    }
  }
}
