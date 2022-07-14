import {Component, Input} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {joinOptions, splitOptions} from "@app/app.common";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {Utils} from "@mixins/utils.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {ObjectOf} from "@utils";
import {InputInfo, InputInfoTypeMap} from "./types";

@Component({
    selector: "app-input",
    templateUrl: "./input.component.html",
    styleUrls: ["./input.component.scss"]
})
export class InputComponent extends Utils() {
    private _info: InputInfo = {type: "string", label: ""};
    @Input()
    get info() {
        return this._info;
    }
    set info(value: InputInfo) {
        this._info = value;
        if (value.type === "select") {
            this.options = value.options.map((v) => {
                if (typeof v === "string") {
                    return {value: v, label: v};
                }
                return v;
            });
        }
    }

    get value() {
        const model = this.info.model;
        if (model) {
            let data = model.data;
            const key = model.key;
            if (data) {
                if (typeof data === "function") {
                    data = data();
                }
            }
            if (data && typeof data === "object" && key) {
                return data[key];
            }
        }
        return "";
    }
    set value(val) {
        const model = this.info.model;
        if (model) {
            let data = model.data;
            const key = model.key;
            if (data) {
                if (typeof data === "function") {
                    data = data();
                }
            }
            if (data && typeof data === "object" && key) {
                data[key] = val;
            }
        }
    }

    get optionKey() {
        if (this.info.type === "string") {
            return this.info.optionKey;
        }
        return null;
    }

    get suffixIcons() {
        return this.info.suffixIcons || [];
    }

    options: {value: string; label?: string}[] = [];

    constructor(private message: MessageService, private dialog: MatDialog, private status: AppStatusService) {
        super();
    }

    copy() {
        const copy = async (str: string) => {
            await navigator.clipboard.writeText(str);
            await this.message.snack(`${this.info.label}已复制`);
        };
        switch (this.info.type) {
            case "string":
                copy(this.value);
                break;
            default:
                break;
        }
    }

    onChange() {
        switch (this.info.type) {
            case "string":
                this.info.onChange?.(this.value);
                break;
            case "number":
                this.info.onChange?.(this.value);
                break;
            case "boolean":
                this.info.onChange?.(this.value);
                break;
            case "select":
                this.info.onChange?.(this.value);
                break;
            default:
                break;
        }
    }

    onInput() {
        switch (this.info.type) {
            case "string":
                this.info.onInput?.(this.value);
                break;
            case "number":
                this.info.onInput?.(this.value);
                break;
            default:
                break;
        }
    }

    async selectOptions(optionKey?: string, key?: string) {
        const data = this.status.cad.data;
        if (optionKey === "huajian") {
            if (!key) {
                return;
            }
            const checkedItems = splitOptions(data.xinghaohuajian[key]);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "花件", checkedItems, xinghao: key}});
            if (Array.isArray(result)) {
                data.xinghaohuajian[key] = joinOptions(result);
            }
        } else if (optionKey === "bancai") {
            const checkedItems = splitOptions(data.morenkailiaobancai);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "板材", checkedItems, multi: false}});
            if (Array.isArray(result) && key) {
                (data as any)[key] = joinOptions(result);
            }
        } else if (optionKey && key) {
            const checkedItems = splitOptions((data as any)[optionKey][key]);
            const result = await openCadOptionsDialog(this.dialog, {data: {data, name: key, checkedItems}});
            if (result) {
                (data as any)[optionKey][key] = joinOptions(result);
            }
        }
    }

    asObject(val: any): ObjectOf<any> {
        if (val && typeof val === "object") {
            return val;
        }
        return {};
    }

    cast<T extends InputInfo["type"]>(data: InputInfo, _: T) {
        return data as InputInfoTypeMap[T];
    }
}
