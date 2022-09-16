import {Component, OnInit, ViewChild} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {setGlobal} from "@src/app/app.common";
import {exportObject, importObject, isObject} from "@utils";
import {JsonEditorComponent, JsonEditorOptions} from "ang-jsoneditor";
import {cloneDeep} from "lodash";

@Component({
    selector: "app-kailiaocanshu",
    templateUrl: "./kailiaocanshu.component.html",
    styleUrls: ["./kailiaocanshu.component.scss"]
})
export class KailiaocanshuComponent implements OnInit {
    data: KailiaocanshuData = {_id: "", 名字: "", 分类: "", 参数: []};
    inputInfos: InputInfo[] = [];
    inputInfos2: InputInfo[][] = [];
    options: JsonEditorOptions = {
        mode: "code",
        modes: ["code", "form", "text", "tree", "view", "preview"]
    } as Partial<JsonEditorOptions> as JsonEditorOptions;
    @ViewChild(JsonEditorComponent) jsonEditor?: JsonEditorComponent;
    useJsonEditor = false;

    defaultQiezhongkongItem: Required<QiezhongkongItem> = {
        type: "单线框",
        offset: ["0", "0", "0", "0"],
        topY: "",
        bottomY: "",
        leftX: "",
        rightX: "",
        外框: {框线: "实线", 显示: "上下左右"},
        内框: {框线: "实线", 显示: "上下左右"},
        双线框厚度: ""
    };

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
        this.spinner.show(this.spinner.defaultLoaderId);
        const response = await this.dataService.post<KailiaocanshuData>("peijian/kailiaocanshu/get", {id});
        this.spinner.hide(this.spinner.defaultLoaderId);
        if (response?.data) {
            this.updateData(response.data);
        }
        setGlobal("kailiaocanshu", this);
    }

    updateData(data?: KailiaocanshuData) {
        if (data) {
            this.data = data;
        } else {
            data = this.data;
        }
        this.inputInfos = [{type: "string", label: "名字", model: {key: "名字", data}, showEmpty: true}];
        if (this.data.分类 === "切中空") {
            this.useJsonEditor = false;
            if (!Array.isArray(data.参数)) {
                data.参数 = [];
            }
            this.data.参数 = data.参数.map((v: any) => {
                if (!isObject(v)) {
                    v = {};
                }
                return importObject(v, this.defaultQiezhongkongItem);
            });
            const 参数: QiezhongkongItem[] = data.参数;
            const allDirections = ["上", "下", "左", "右"] as const;
            this.inputInfos2 = 参数.map((v: QiezhongkongItem) => {
                importObject(v, this.defaultQiezhongkongItem);
                const infos: InputInfo[] = [
                    {
                        type: "select",
                        label: "切内空类型",
                        options: qiezhongkongTypes.map((vv) => {
                            if (vv === "双线框") {
                                return {value: vv, label: "45度双线框"};
                            } else if (vv === "90度拼接双线框") {
                                return {value: vv, label: "90度双线框"};
                            } else {
                                return vv;
                            }
                        }),
                        model: {key: "type", data: v},
                        onChange: () => {
                            this.updateData();
                        },
                        showEmpty: true
                    },
                    {
                        type: "group",
                        label: "外框基准线",
                        infos: [
                            {type: "string", label: "上", model: {key: "topY", data: v}, showEmpty: true},
                            {type: "string", label: "下", model: {key: "bottomY", data: v}, showEmpty: true},
                            {type: "string", label: "左", model: {key: "leftX", data: v}, showEmpty: true},
                            {type: "string", label: "右", model: {key: "rightX", data: v}, showEmpty: true}
                        ]
                    },
                    {
                        type: "group",
                        label: "外框从基准线缩小值",
                        infos: v.offset.map<InputInfo>((_, i) => ({
                            type: "string",
                            label: allDirections[i],
                            model: {key: String(i), data: v.offset},
                            showEmpty: true
                        })),
                        showEmpty: true
                    },
                    {
                        type: "group",
                        label: "",
                        infos: (() => {
                            const arr: InputInfo[] = [
                                {
                                    type: "group",
                                    label: "外框",
                                    infos: [
                                        {
                                            type: "select",
                                            label: "框线",
                                            options: ["实线", "虚线"],
                                            model: {key: "框线", data: v.外框},
                                            showEmpty: true
                                        },
                                        {
                                            type: "selectMulti",
                                            label: "切哪里",
                                            options: allDirections.slice(),
                                            optionText: (val) => val.join(""),
                                            value: allDirections.filter((vv) => v.外框?.显示.includes(vv)),
                                            onChange: (value: string[]) => {
                                                if (!v.外框) {
                                                    v.外框 = cloneDeep(this.defaultQiezhongkongItem.外框);
                                                }
                                                v.外框.显示 = value.join("");
                                            },
                                            showEmpty: true
                                        }
                                    ]
                                }
                            ];
                            if (v.type !== "单线框") {
                                arr.push({
                                    type: "group",
                                    label: "内框",
                                    infos: [
                                        {
                                            type: "select",
                                            label: "框线",
                                            options: ["实线", "虚线"],
                                            model: {key: "框线", data: v.内框},
                                            showEmpty: true
                                        },
                                        {
                                            type: "selectMulti",
                                            label: "切哪里",
                                            options: allDirections.slice(),
                                            optionText: (val) => val.join(""),
                                            value: allDirections.filter((vv) => v.内框?.显示.includes(vv)),
                                            onChange: (val: string[]) => {
                                                if (!v.内框) {
                                                    v.内框 = cloneDeep(this.defaultQiezhongkongItem.内框);
                                                }
                                                v.内框.显示 = val.join("");
                                            },
                                            showEmpty: true
                                        }
                                    ]
                                });
                            }
                            return arr;
                        })()
                    }
                ];
                if (v.type !== "单线框") {
                    infos.splice(3, 0, {
                        type: "string",
                        label: "双线框厚度",
                        model: {key: "双线框厚度", data: v},
                        placeholder: "留空时默认取门扇厚度"
                    });
                }
                return infos;
            });
        } else {
            this.useJsonEditor = true;
            this.inputInfos2 = [];
        }
    }

    addQiezhongkongItem(i: number) {
        const 参数: QiezhongkongItem[] = this.data.参数;
        参数.splice(i + 1, 0, importObject({}, this.defaultQiezhongkongItem));
        this.updateData();
    }

    removeQiezhongkongItem(i: number) {
        const 参数: QiezhongkongItem[] = this.data.参数;
        参数.splice(i, 1);
        this.updateData();
    }

    copyQiezhongkongItem(i: number) {
        const 参数: QiezhongkongItem[] = this.data.参数;
        参数.splice(i + 1, 0, cloneDeep(参数[i]));
        this.updateData();
    }

    async submit() {
        const {jsonEditor} = this;
        let data = this.data;
        if (jsonEditor) {
            if (!jsonEditor.isValidJson()) {
                this.message.error("JSON格式错误");
                return;
            }
            data.参数 = jsonEditor.get();
        } else {
            let valid = true;
            for (const v of data.参数 as QiezhongkongItem[]) {
                if (!v.topY || !v.bottomY || !v.leftX || !v.rightX) {
                    valid = false;
                }
                if (!v.offset.every(Boolean)) {
                    valid = false;
                }
                if (!valid) {
                    this.message.error("数据没有填写完整");
                    return;
                }
                if (v.双线框厚度) {
                    const 双线框厚度 = Number(v.双线框厚度);
                    if (isNaN(双线框厚度) || 双线框厚度 <= 0) {
                        this.message.error("双线框厚度必须对应门扇厚度");
                        return;
                    }
                }
            }
            data = cloneDeep(data);
            for (const v of data.参数) {
                const {type, offset} = v;
                exportObject(v, this.defaultQiezhongkongItem);
                v.type = type;
                v.offset = offset;
            }
        }
        this.spinner.show(this.spinner.defaultLoaderId);
        await this.dataService.post<KailiaocanshuData>("peijian/kailiaocanshu/set", {data});
        this.spinner.hide(this.spinner.defaultLoaderId);
    }
}

export interface KailiaocanshuData {
    _id: string;
    名字: string;
    分类: string;
    参数: any;
}

export const qiezhongkongTypes = ["单线框", "双线框", "90度拼接双线框"] as const;
export type QiezhongkongType = typeof qiezhongkongTypes[number];

export interface QiezhongkongItem {
    type: QiezhongkongType;
    offset: [string, string, string, string];
    外框?: QiezhongkongKuangxian;
    内框?: QiezhongkongKuangxian;
    topY?: string;
    rightX?: string;
    bottomY?: string;
    leftX?: string;
    双线框厚度?: string;
}

export interface QiezhongkongKuangxian {
    框线: "实线" | "虚线";
    显示: string;
}
