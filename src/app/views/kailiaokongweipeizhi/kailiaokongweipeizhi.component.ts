import {Component, OnInit} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {setDevComponent} from "@app/app.common";
import {InputInfo} from "@components/input/types";
import {Utils} from "@mixins/utils.mixin";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {ObjectOf} from "@utils";
import {Kailiaokongweipeizhi, KlkwpzItem, KlkwpzItemType2, KlkwpzItemType3} from "./kailiaokongweipeizhi";

export interface KailiaokongweipeizhiData {
    item: KlkwpzItem;
    inputs1: InputInfo[];
    inputs2: InputInfo[];
    inputs3: InputInfo[];
}

@Component({
    selector: "app-kailiaokongweipeizhi",
    templateUrl: "./kailiaokongweipeizhi.component.html",
    styleUrls: ["./kailiaokongweipeizhi.component.scss"]
})
export class KailiaokongweipeizhiComponent extends Utils() implements OnInit {
    id = "";
    klkwpz = new Kailiaokongweipeizhi();
    loaderId = "kailiaokongweipeizhi";
    data: KailiaokongweipeizhiData[] = [];

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private message: MessageService,
        private spinner: SpinnerService
    ) {
        super();
    }

    ngOnInit() {
        setDevComponent("klkwpz", this);
        this.route.queryParams.subscribe(async (queryParams) => {
            const id = queryParams.id;
            this.id = id;
            const response = await this.dataService.get<ObjectOf<KlkwpzItem[]>>("peijian/kailiaokongweipeizhi/get", {id});
            const data = response?.data;
            if (typeof data === "object" && !Array.isArray(data)) {
                this.klkwpz.init(data);
                this.data = this.klkwpz.data.map((item) => {
                    if (!item.自增等距阵列) {
                        item.自增等距阵列 = this._createItem("").自增等距阵列;
                    }
                    delete item.固定行列阵列;
                    delete item.固定行列阵列;
                    const result: KailiaokongweipeizhiData = {
                        item,
                        inputs1: [
                            {
                                type: "select",
                                label: "类型",
                                options: ["自定义XY基准", "面基准"] as KlkwpzItemType2[],
                                model: {data: item, key: "类型2"},
                                onChange: () => this._updateItemInputs2(result)
                            },
                            {
                                type: "select",
                                label: "阵列零件范围",
                                options: ["无阵列", "阵列范围缩减", "阵列限定宽高", "阵列不限制"] as KlkwpzItemType3[],
                                model: {data: item, key: "类型3"},
                                onChange: () => this._updateItemInputs3(result)
                            },
                            {type: "string", label: "名字", model: {data: item, key: "name"}},
                            {
                                type: "select",
                                label: "允许超出范围",
                                options: ["不允许超出", "允许超出X", "允许超出Y", "允许超出X和Y"],
                                value: (() => {
                                    const {不删除超出板材的孔, 删除超出板材的孔X, 删除超出板材的孔Y} = item;
                                    let removeX = 删除超出板材的孔X === "是";
                                    let removeY = 删除超出板材的孔Y === "是";
                                    if (不删除超出板材的孔 === "是") {
                                        removeX = false;
                                        removeY = false;
                                    } else if (!removeX && !removeY) {
                                        removeX = true;
                                        removeY = true;
                                    }
                                    if (!removeX && !removeY) {
                                        return "允许超出X和Y";
                                    } else if (removeX && removeY) {
                                        return "不允许超出";
                                    } else if (removeX) {
                                        return "允许超出Y";
                                    } else {
                                        return "允许超出X";
                                    }
                                })(),
                                onChange: (val) => {
                                    if (val === "允许超出X") {
                                        delete item.不删除超出板材的孔;
                                        delete item.删除超出板材的孔X;
                                        item.删除超出板材的孔Y = "是";
                                    } else if (val === "允许超出Y") {
                                        delete item.不删除超出板材的孔;
                                        item.删除超出板材的孔X = "是";
                                        delete item.删除超出板材的孔Y;
                                    } else if (val === "允许超出X和Y") {
                                        item.不删除超出板材的孔 = "是";
                                        delete item.删除超出板材的孔X;
                                        delete item.删除超出板材的孔Y;
                                    } else {
                                        delete item.不删除超出板材的孔;
                                        delete item.删除超出板材的孔X;
                                        delete item.删除超出板材的孔Y;
                                    }
                                }
                            }
                        ],
                        inputs2: [],
                        inputs3: []
                    };
                    this._updateItemInputs2(result);
                    return result;
                });
            }
        });
    }

    private _createItem(name: string): KlkwpzItem {
        const item = this.klkwpz.getKlkwpzItem(name, {});
        console.log(item);
        delete item.增加指定偏移;
        delete item.自增等距阵列;
        item.自增等距阵列 = {
            自增方向: "上右",
            行数: "",
            列数: "",
            行距: "",
            列距: "",
            孔依附板材边缘: "否"
        };
        return item;
    }

    private _updateItemInputs2(data: KailiaokongweipeizhiData) {
        const item = data.item;
        const {类型2} = item;
        if (类型2 === "自定义XY基准") {
            data.inputs2 = [
                {type: "number", label: "基准X", model: {data: item, key: "基准X"}},
                {type: "number", label: "基准Y", model: {data: item, key: "基准Y"}},
                {type: "coordinate", label: "孔cad基准", model: {data: item, key: "anchor2"}}
            ];
        } else if (类型2 === "面基准") {
            data.inputs2 = [
                {type: "coordinate", label: "零件面基准", model: {data: item, key: "anchor1"}},
                {type: "coordinate", label: "孔cad基准", model: {data: item, key: "anchor2"}}
            ];
        } else {
            data.inputs2 = [];
        }
    }

    private _updateItemInputs3(data: KailiaokongweipeizhiData) {
        const item = data.item;
        const {类型3} = item;
        if (类型3 === "阵列范围缩减") {
            data.inputs3 = [
            ];
        } else if (类型3 === "阵列限定宽高") {
            data.inputs3 = [
            ];
        } else if (类型3 === "阵列不限制") {
        } else {
            data.inputs3 = [];
        }
    }

    async submit() {
        console.log(this.klkwpz);
        // this.spinner.show(this.loaderId);
        // await this.dataService.post("peijian/kailiaokongweipeizhi/set", {id: this.id, data: this.klkwpz.export()});
        // this.spinner.hide(this.loaderId);
    }
}
