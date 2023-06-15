import {AfterViewInit, Component, OnDestroy} from "@angular/core";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {ActivatedRoute} from "@angular/router";
import {CadData, CadViewer} from "@lucilor/cad-viewer";
import {timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";

export type PreviewData = {
  CAD?: any;
  code: string;
  codeText?: string;
  text: string[];
  type: "说明" | "CAD";
  zhankai: string;
  title?: string;
  cadImg: SafeUrl;
}[][];

@Component({
  selector: "app-print-a4-a015-preview",
  templateUrl: "./print-a4-a015-preview.component.html",
  styleUrls: ["./print-a4-a015-preview.component.scss"]
})
export class PrintA4A015PreviewComponent implements AfterViewInit, OnDestroy {
  data: PreviewData = [];
  loaderId = "printPreview";

  constructor(
    private sanitizer: DomSanitizer,
    private dataService: CadDataService,
    private route: ActivatedRoute,
    private spinner: SpinnerService
  ) {}

  async ngAfterViewInit() {
    const response = await this.dataService.post<PreviewData>("order/printCode/printA4A015Preview", this.route.snapshot.queryParams);
    const data = this.dataService.getResponseData(response);
    if (!data) {
      return;
    }
    this.data = data;
    const total = this.data.reduce((sum, v) => sum + v.length, 0);
    let done = 0;
    this.spinner.show(this.loaderId, {text: `0 / ${total}`});
    for (const page of this.data) {
      for (const card of page) {
        if (card.type === "CAD") {
          const cad = new CadViewer(new CadData(card.CAD), {
            padding: [15],
            width: 92,
            height: 92,
            backgroundColor: "white"
          });
          document.body.appendChild(cad.dom);
          cad.data.transform({scale: [1, -1]}, true);
          await cad.render();
          cad.center();
          card.cadImg = this.sanitizer.bypassSecurityTrustUrl(cad.toBase64());
          cad.destroy();
        }
        done++;
        this.spinner.show(this.loaderId, {text: `${done} / ${total}`});
      }
      await timeout(0);
    }
    this.spinner.hide(this.loaderId);
  }

  ngOnDestroy() {
    document.body.style.overflowX = "";
    document.body.style.overflowY = "";
  }

  printPages() {
    print();
  }

  getTop(i: number) {
    switch (Math.floor(i / 4)) {
      case 0:
        return "10px";
      case 1:
        return "9px";
      case 2:
        return "10px";
      case 3:
        return "11px";
      case 4:
        return "11px";
      case 5:
        return "11px";
      case 6:
        return "11px";
      default:
        return "0px";
    }
  }

  getLeft(i: number) {
    return (i % 4 ? 10 : 0) + "px";
  }
}
