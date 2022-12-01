import {Component, OnInit, ViewChild} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {KailiaocanshuData, KlcsComponent} from "@components/klcs/klcs.component";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";

@Component({
  selector: "app-kailiaocanshu",
  templateUrl: "./kailiaocanshu.component.html",
  styleUrls: ["./kailiaocanshu.component.scss"]
})
export class KailiaocanshuComponent implements OnInit {
  loaderId = "kailiaocanshu";
  data: KailiaocanshuData = {_id: "", 名字: "", 分类: "", 参数: []};
  @ViewChild(KlcsComponent) klcsComponent?: KlcsComponent;

  constructor(
    private route: ActivatedRoute,
    private dataService: CadDataService,
    private spinner: SpinnerService,
    private message: MessageService
  ) {}

  async ngOnInit() {
    const {id} = this.route.snapshot.queryParams;
    if (!id) {
      return;
    }
    this.spinner.show(this.loaderId);
    const response = await this.dataService.post<KailiaocanshuData>("peijian/kailiaocanshu/get", {id});
    this.spinner.hide(this.loaderId);
    if (response?.data) {
      this.data = response.data;
    }
    setGlobal("kailiaocanshu", this);
  }

  async submit() {
    if (this.klcsComponent) {
      const data = await this.klcsComponent.submit();
      if (data) {
        this.spinner.show(this.loaderId);
        await this.dataService.post<KailiaocanshuData>("peijian/kailiaocanshu/set", {data});
        this.spinner.hide(this.loaderId);
      }
    }
  }
}
