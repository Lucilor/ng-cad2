import {Component, Input} from "@angular/core";
import {Validators} from "@angular/forms";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {Klkwpz, KlkwpzItem, KlkwpzSource} from "./klkwpz";

@Component({
    selector: "app-klkwpz",
    templateUrl: "./klkwpz.component.html",
    styleUrls: ["./klkwpz.component.scss"]
})
export class KlkwpzComponent {
    private _data: KlkwpzSource = {};
    @Input()
    get data() {
        return this._data;
    }
    set data(value) {
        this._data = value;
        this.klkwpz.init(value);
        this.formData = this.klkwpz.data.map((item) => this._getItemData(item));
    }
    klkwpz = new Klkwpz();
    formData: KlkwpzFormItem[] = [];

    constructor(private message: MessageService) {}

    private _createItem(name: string): KlkwpzItem {
        const item = this.klkwpz.getKlkwpzItem(name, {});
        item.anchor1 = [0, 0];
        item.anchor2 = [0.5, 0.5];
        return item;
    }

    private _getItemData(item: KlkwpzItem) {
        if (!item.自增等距阵列) {
            item.自增等距阵列 = this._createItem("").自增等距阵列;
        }
        delete item.固定行列阵列;
        delete item.固定行列阵列;
        const typesData = {
            type2: (() => {
                if (item.baseX && item.baseY) {
                    return "取横线竖线交点";
                }
                return "在打孔面上";
            })(),
            type3: (() => {
                if (item.自增等距阵列 || item.固定行列阵列) {
                    if (item.板材孔位阵列范围) {
                        return "按指定宽高打阵列孔";
                    } else if (item.板材打孔范围缩减) {
                        return "按展开高打阵列孔（缩短范围）";
                    }
                    return "按展开高打阵列孔";
                }
                return "打单个孔";
            })()
        };
        const result: KlkwpzFormItem = {
            item,
            inputs1: [
                {
                    type: "string",
                    label: "孔名字",
                    validators: [Validators.required],
                    model: {data: item, key: "name"}
                },
                {
                    type: "select",
                    label: "打孔类型",
                    options: ["打单个孔", "按展开高打阵列孔", "按展开高打阵列孔（缩短范围）", "按指定宽高打阵列孔"],
                    model: {data: typesData, key: "type3"},
                    onChange: () => this._updateItemInputs3(result, typesData)
                },
                {
                    type: "select",
                    label: "允许孔超出零件边缘",
                    options: ["不允许超出", "允许左右超出", "允许上下超出", "都允许超出"],
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
                            return "都允许超出";
                        } else if (removeX && removeY) {
                            return "不允许超出";
                        } else if (removeX) {
                            return "允许上下超出";
                        } else {
                            return "允许左右超出";
                        }
                    })(),
                    onChange: (val) => {
                        if (val === "允许左右超出") {
                            delete item.不删除超出板材的孔;
                            delete item.删除超出板材的孔X;
                            item.删除超出板材的孔Y = "是";
                        } else if (val === "允许上下超出") {
                            delete item.不删除超出板材的孔;
                            item.删除超出板材的孔X = "是";
                            delete item.删除超出板材的孔Y;
                        } else if (val === "都允许超出") {
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
        this._updateItemInputs2(result, typesData);
        this._updateItemInputs3(result, typesData);
        return result;
    }

    private _updateItemInputs2(data: KlkwpzFormItem, typesData: {type2: string}) {
        const item = data.item;
        const arr: InputInfo[] = [];
        const info0: InputInfo = {
            type: "select",
            label: "打孔起始点",
            options: ["取横线竖线交点", "在打孔面上"],
            model: {data: typesData, key: "type2"},
            onChange: () => this._updateItemInputs2(data, typesData)
        };
        const type2 = typesData.type2;
        if (type2 === "取横线竖线交点") {
            delete item.face;
            if (!item.baseX) {
                item.baseX = "";
            }
            if (!item.baseY) {
                item.baseY = "";
            }
            arr.push(info0, {
                type: "group",
                label: " ",
                infos: [
                    {type: "string", label: "横线名字", model: {data: item, key: "baseX"}},
                    {type: "string", label: "竖线名字", model: {data: item, key: "baseY"}}
                ]
            });
        } else if (type2 === "在打孔面上") {
            delete item.baseX;
            delete item.baseY;
            if (!item.face) {
                item.face = "";
            }
            arr.push(
                {
                    type: "group",
                    label: "",
                    infos: [info0, {type: "string", label: "打孔面名字", model: {data: item, key: "face"}}]
                },
                {type: "coordinate", label: "", labelX: "打孔面起始点X", labelY: "打孔面起始点Y", model: {data: item, key: "anchor1"}}
            );
        }
        arr.push(
            {type: "coordinate", label: "", labelX: "孔cad定位点X", labelY: "孔cad定位点Y", model: {data: item, key: "anchor2"}},
            {type: "string", label: "第一个孔定位点到打孔起始点的x方向距离", model: {data: item, key: "x"}},
            {type: "string", label: "第一个孔定位点到打孔起始点的y方向距离", model: {data: item, key: "y"}}
        );
        data.inputs2 = arr;
    }

    private _updateItemInputs3(data: KlkwpzFormItem, typesData: {type3: string}) {
        const item = data.item;
        let arr: InputInfo[] = [];
        let hasMatrix = true;
        const type3 = typesData.type3;
        if (type3 === "按展开高打阵列孔") {
            delete item.板材孔位阵列范围;
            delete item.板材打孔范围缩减;
        } else if (type3 === "按展开高打阵列孔（缩短范围）") {
            if (!item.板材打孔范围缩减) {
                item.板材打孔范围缩减 = {上: "", 下: "", 左: "", 右: ""};
            }
            arr.push({
                type: "group",
                label: "阵列范围缩减",
                infos: [
                    {type: "string", label: "上", model: {data: item.板材打孔范围缩减, key: "上"}},
                    {type: "string", label: "下", model: {data: item.板材打孔范围缩减, key: "下"}},
                    {type: "string", label: "左", model: {data: item.板材打孔范围缩减, key: "左"}},
                    {type: "string", label: "右", model: {data: item.板材打孔范围缩减, key: "右"}}
                ]
            });
            delete item.板材孔位阵列范围;
        } else if (type3 === "按指定宽高打阵列孔") {
            delete item.板材打孔范围缩减;
            if (!item.板材孔位阵列范围) {
                item.板材孔位阵列范围 = {宽: "", 高: ""};
            }
            arr.push({
                type: "group",
                label: "板材孔位阵列范围",
                infos: [
                    {type: "string", label: "宽", model: {data: item.板材孔位阵列范围, key: "宽"}},
                    {type: "string", label: "高", model: {data: item.板材孔位阵列范围, key: "高"}}
                ]
            });
        } else {
            delete item.板材孔位阵列范围;
            delete item.板材打孔范围缩减;
            hasMatrix = false;
        }
        if (hasMatrix) {
            item.类型 = "自增等距阵列";
            const matrix: KlkwpzItem["自增等距阵列"] = {自增方向: "上右", 行数: "1", 列数: "1", 行距: "0", 列距: "0", 孔依附板材边缘: "否"};
            if (!item.自增等距阵列) {
                item.自增等距阵列 = matrix;
            } else {
                item.自增等距阵列 = {...matrix, ...item.自增等距阵列};
            }
            delete item.固定行列阵列;
            delete item.增加指定偏移;
            arr = (
                [
                    {
                        type: "group",
                        label: "",
                        infos: [
                            {
                                type: "select",
                                label: "自增方向",
                                options: ["上右", "下右", "上左", "下左"],
                                model: {data: item.自增等距阵列, key: "自增方向"}
                            },
                            {
                                type: "select",
                                label: "剪切相交XY线",
                                options: ["是", "否"],
                                model: {data: item.自增等距阵列, key: "孔依附板材边缘"}
                            }
                        ]
                    },
                    {
                        type: "group",
                        label: "",
                        infos: [
                            {type: "string", label: "行数", model: {data: item.自增等距阵列, key: "行数"}},
                            {type: "string", label: "列数", model: {data: item.自增等距阵列, key: "列数"}},
                            {type: "string", label: "行距", model: {data: item.自增等距阵列, key: "行距"}},
                            {type: "string", label: "列距", model: {data: item.自增等距阵列, key: "列距"}}
                        ]
                    }
                ] as InputInfo[]
            ).concat(arr);
        } else {
            delete item.类型;
            delete item.自增等距阵列;
            delete item.固定行列阵列;
            delete item.增加指定偏移;
            if (!item.孔依附板材边缘) {
                item.孔依附板材边缘 = "否";
            }
            arr = (
                [
                    {
                        type: "select",
                        label: "剪切相交XY线",
                        options: ["是", "否"],
                        model: {data: item, key: "孔依附板材边缘"}
                    }
                ] as InputInfo[]
            ).concat(arr);
        }
        data.inputs3 = arr;
    }

    addItem(i: number, fromItem?: KlkwpzItem) {
        let item: KlkwpzItem;
        if (fromItem) {
            item = cloneDeep(fromItem);
        } else {
            item = this._createItem("");
        }
        this.klkwpz.data.splice(i + 1, 0, item);
        this.formData.splice(i + 1, 0, this._getItemData(item));
    }

    removeItem(i: number) {
        this.klkwpz.data.splice(i, 1);
        this.formData.splice(i, 1);
    }

    private _isInfoEmpty(info: InputInfo): boolean {
        if (info.type === "group") {
            if (info.infos) {
                return info.infos.some((v) => this._isInfoEmpty(v));
            } else {
                return false;
            }
        }
        if (info.model) {
            const {data, key} = info.model;
            if (data && key) {
                return !data[key];
            }
        }
        return false;
    }

    submit() {
        for (const item of this.formData) {
            const inputs = [...item.inputs1, ...item.inputs2, ...item.inputs3];
            for (const info of inputs) {
                if (this._isInfoEmpty(info)) {
                    this.message.alert("请填写完整信息");
                    return false;
                }
            }
        }
        return true;
    }

    printItem(item: KlkwpzItem) {
        console.log(this.klkwpz.exportItem(item));
    }

    getInfoClass(info: InputInfo) {
        const result: string[] = [info.label];
        if (this._isInfoEmpty(info)) {
            result.push("empty");
        }
        return result.join(" ");
    }
}

export interface KlkwpzFormItem {
    item: KlkwpzItem;
    inputs1: InputInfo[];
    inputs2: InputInfo[];
    inputs3: InputInfo[];
}
