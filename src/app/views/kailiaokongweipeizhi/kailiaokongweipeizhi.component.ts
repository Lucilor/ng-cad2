import {Component, OnInit, ViewChild} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {KlkwpzSource, KlkwpzItem} from "@components/klkwpz/klkwpz";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import testData from "@components/klkwpz/klkwpz.test.json";
import {environment} from "@env";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {ObjectOf} from "@utils";

@Component({
    selector: "app-kailiaokongweipeizhi",
    templateUrl: "./kailiaokongweipeizhi.component.html",
    styleUrls: ["./kailiaokongweipeizhi.component.scss"]
})
export class KailiaokongweipeizhiComponent implements OnInit {
    id = "";
    loaderId = "kailiaokongweipeizhi";
    data: KlkwpzSource = {};
    @ViewChild(KlkwpzComponent) klkwpzComponent?: KlkwpzComponent;

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private message: MessageService,
        private spinner: SpinnerService
    ) {}

    ngOnInit() {
        this._fetch();
    }

    private async _fetch() {
        const id = this.route.snapshot.queryParams.id;
        if (id) {
            this.id = id;
            const response = await this.dataService.get<ObjectOf<KlkwpzItem[]>>("peijian/kailiaokongweipeizhi/get", {id});
            const data = response?.data;
            if (typeof data === "object" && !Array.isArray(data)) {
                this.data = data;
            }
        } else {
            if (environment.production) {
                this.message.error("参数错误");
                return;
            } else {
                this.data = testData as any;
            }
        }
    }

    async submit() {
        if (this.klkwpzComponent && this.klkwpzComponent.submit()) {
            this.spinner.show(this.loaderId);
            const response = await this.dataService.post("peijian/kailiaokongweipeizhi/set", {
                id: this.id,
                data: this.klkwpzComponent.klkwpz.export()
            });
            if (response?.code === 0) {
                this._fetch();
            }
            this.spinner.hide(this.loaderId);
        }
    }
}
