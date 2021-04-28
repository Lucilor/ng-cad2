import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {Utils} from "@src/app/mixins/utils.mixin";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {ObjectOf} from "@src/app/utils";
import {Kailiaokongweipeizhi, KailiaokongweipeizhiSource, KlkwpzItem, KlkwpzItemMatrixBase} from "./kailiaokongweipeizhi";

@Component({
    selector: "app-kailiaokongweipeizhi",
    templateUrl: "./kailiaokongweipeizhi.component.html",
    styleUrls: ["./kailiaokongweipeizhi.component.scss"]
})
export class KailiaokongweipeizhiComponent extends Utils() implements OnInit {
    id = "";
    klkwpz = new Kailiaokongweipeizhi();
    get data() {
        return this.klkwpz.data;
    }
    get emptyItem1(): Kailiaokongweipeizhi["data"][0] {
        return {key: "", value: []};
    }
    get emptyItem2(): Kailiaokongweipeizhi["data"][0]["value"][0] {
        return {
            x: "",
            y: "",
            face: "",
            anchor1: [0, 0],
            anchor2: [0, 0],
            maxX: "",
            maxY: "",
            baseX: "",
            baseY: "",
            板材打孔范围缩减: {上: "", 下: "", 左: "", 右: ""},
            删除超出板材的孔: "是",
            类型: ""
        };
    }

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private status: AppStatusService,
        private message: MessageService
    ) {
        super();
    }

    ngOnInit() {
        (window as any).k = this;
        this.route.queryParams.subscribe(async (queryParams) => {
            const id = queryParams.id;
            this.id = id;
            const response = await this.dataService.get<ObjectOf<KlkwpzItem[]>>("peijian/kailiaokongweipeizhi/get", {id});
            const data = response?.data;
            if (typeof data === "object" && !Array.isArray(data)) {
                this.klkwpz.init(data);
            }
            console.log(response);
        });
    }

    async submit() {
        this.status.startLoader({id: "submit"});
        await this.dataService.post("peijian/kailiaokongweipeizhi/set", {id: this.id, data: this.klkwpz.export()});
        this.status.stopLoader();
    }

    getItemMatrix(item: KlkwpzItem, key: keyof KlkwpzItemMatrixBase) {
        if (item.类型 === "自增等距阵列") {
            return item.自增等距阵列[key];
        }
        if (item.类型 === "固定行列阵列") {
            return item.固定行列阵列[key];
        }
        throw new Error("invalid type: " + item.类型);
    }

    setItemMatrix(item: KlkwpzItem, key: keyof KlkwpzItemMatrixBase, event: Event) {
        const value = (event.target as any).value;
        if (item.类型 === "自增等距阵列") {
            item.自增等距阵列[key] = value;
        } else if (item.类型 === "固定行列阵列") {
            item.固定行列阵列[key] = value;
        } else {
            throw new Error("invalid type: " + item.类型);
        }
    }

    async copy(type: string, value: any) {
        await navigator.clipboard.writeText(JSON.stringify({type, value}));
        this.message.snack("内容已复制");
    }

    async paste(type: string) {
        const str = await navigator.clipboard.readText();
        let value: any;
        try {
            const data = JSON.parse(str);
            if (data.type === type) {
                value = data.value;
            }
        } catch (error) {}
        if (value) {
            this.message.snack("内容已粘贴");
            return value;
        } else {
            this.message.alert("内容有误<br>" + str);
            return null;
        }
    }

    async copyT1() {
        await this.copy("t1", this.klkwpz.export());
    }

    async pasteT1() {
        const data: KailiaokongweipeizhiSource | null = await this.paste("t1");
        if (data) {
            this.klkwpz.init(data);
        }
    }

    async copyT2(i: number) {
        await this.copy("t2", this.data[i]);
    }

    async pasteT2(i: number) {
        const data: Kailiaokongweipeizhi["data"][0] | null = await this.paste("t2");
        if (data) {
            this.data[i] = data;
        }
    }

    async copyT3(i: number, j: number) {
        await this.copy("t3", this.data[i].value[j]);
    }

    async pasteT3(i: number, j: number) {
        const data: KlkwpzItem | null = await this.paste("t3");
        if (data) {
            this.data[i].value[j] = data;
        }
    }
}
