import {ObjectOf} from "@utils";

export class Jiaowei {
    data: JiaoweiData = {};

    constructor(source: ObjectOf<any>[] = []) {
        this.import(source);
    }

    import(source: ObjectOf<any>[]) {
        this.data = {};
        if (!Array.isArray(source)) {
            return;
        }
        for (const sourceItem of source) {
            this.addItem(sourceItem);
        }
    }

    export() {
        return Object.entries(this.data).map(([num, value]) => {
            const result: ObjectOf<any> = {};
            const {items, disabled} = value;
            result.条件 = [`门铰数量==${num}`];
            result.不做 = !!disabled;
            if (!disabled) {
                for (const [i, item] of items.entries()) {
                    result[`铰位${i + 1}中⼼Y距离基准`] = item.anchor;
                    result[`铰位${i + 1}中⼼Y距离`] = item.distance;
                }
            }
            return result;
        });
    }

    addItem(sourceItem: ObjectOf<any>) {
        if (typeof sourceItem !== "object" || !Array.isArray(sourceItem.条件)) {
            return;
        }
        let num = 0;
        for (const str of sourceItem.条件) {
            const matchResult = str.match(/门铰数量==(\d+)/);
            if (matchResult) {
                num = parseInt(matchResult[1], 10);
                if (num > 0) {
                    break;
                }
            }
        }
        if (!(num > 0)) {
            return;
        }
        const dataItem: JiaoweiDataItem = {items: [], disabled: false};
        if (typeof sourceItem.不做 === "boolean") {
            dataItem.disabled = sourceItem.不做;
        } else if (num === 5) {
            dataItem.disabled = true;
        }
        switch (num) {
            case 2:
                dataItem.items = [
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇底部", distance: 0}
                ];
                break;
            case 3:
                dataItem.items = [
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇底部", distance: 0}
                ];
                break;
            case 4:
                dataItem.items = [
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇底部", distance: 0},
                    {anchor: "剩余平分", distance: 0}
                ];
                break;
            case 5:
                dataItem.items = [
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇顶部", distance: 0},
                    {anchor: "门扇底部", distance: 0},
                    {anchor: "门扇底部", distance: 0}
                ];
                break;
            default:
                return;
        }
        for (const [i, item] of dataItem.items.entries()) {
            const anchor = sourceItem[`铰位${i + 1}中⼼Y距离基准`];
            const distance = sourceItem[`铰位${i + 1}中⼼Y距离`];
            if (anchor) {
                item.anchor = anchor;
            }
            if (typeof distance === "number" && !isNaN(distance)) {
                item.distance = distance;
            }
        }
        this.data[num] = dataItem;
    }
}

export type JiaoweiAnchor = "门扇顶部" | "门扇底部" | "剩余平分";
export const jiaoweiAnchorOptions: JiaoweiAnchor[] = ["门扇顶部", "门扇底部", "剩余平分"];

export interface JiaoweiDataItemItem {
    anchor: JiaoweiAnchor;
    distance: number;
}
export interface JiaoweiDataItem {
    items: JiaoweiDataItemItem[];
    disabled: boolean;
}
export type JiaoweiData = ObjectOf<JiaoweiDataItem>;
