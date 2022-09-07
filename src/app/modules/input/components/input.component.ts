import {Component, Input} from "@angular/core";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatDialog} from "@angular/material/dialog";
import {joinOptions, splitOptions} from "@app/app.common";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {Utils} from "@mixins/utils.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {ObjectOf, timeout} from "@utils";
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
        if (!value.autocomplete) {
            value.autocomplete = "off";
        }
        if (value.type === "select" || value.type === "string") {
            this.options = (value.options || []).map((v) => {
                if (typeof v === "string") {
                    return {value: v, label: v};
                }
                return {label: v.label || v.value, value: v.value};
            });
        }
        if ("value" in value) {
            const {data, key} = this.model;
            if (data && typeof data === "object" && key) {
                data[key] = value.value;
            }
        }
    }
    private _onChangeTimeout = -1;

    private _model: NonNullable<Required<InputInfo["model"]>> = {data: {key: ""}, key: "key"};
    get model() {
        let model = {...this.info.model};
        if (!model || !("data" in model) || !("key" in model)) {
            model = this._model;
        }
        if (typeof model.data === "function") {
            model.data = model.data();
        }
        return model;
    }

    get value() {
        const {data, key} = this.model;
        if (data && typeof data === "object" && key) {
            return data[key];
        }
        return "";
    }
    set value(val) {
        const {data, key} = this.model;
        if (data && typeof data === "object" && key) {
            data[key] = val;
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

    options: {value: string; label: string}[] = [];
    // get selectedValue() {
    //     const value = this.value;
    //     const option = this.options.find((v) => v.value === value || v.label === value);
    //     if (option) {
    //         return option.label || option.value;
    //     }
    //     return value;
    // }
    get filteredOptions() {
        const val = this.value;
        if (!val) {
            return [];
        }
        return this.options.filter(({value, label}) => value.includes(val) || label.includes(val));
    }

    anchorXString = "";
    anchorYString = "";

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

    async onChange(value = this.value, isAutocomplete = false) {
        const info = this.info;
        switch (info.type) {
            case "string":
                if (info.options && !isAutocomplete) {
                    this._onChangeTimeout = window.setTimeout(() => {
                        if (info.optionInputOnly && !this.options.find((v) => v.value === value)) {
                            value = this.value = "";
                        }
                        info.onChange?.(value);
                    }, 200);
                } else {
                    info.onChange?.(value);
                }
                break;
            case "number":
                info.onChange?.(value);
                break;
            case "boolean":
                info.onChange?.(value);
                break;
            case "select":
                info.onChange?.(value);
                break;
            case "coordinate":
                info.onChange?.(value);
                break;
            default:
                break;
        }
    }

    onAutocompleteChange(event: MatAutocompleteSelectedEvent) {
        window.clearTimeout(this._onChangeTimeout);
        this.onChange(event.option.value, true);
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
            if (key) {
                let value = (data as any)[key];
                if (typeof value !== "string") {
                    value = "";
                }
                const checkedItems = splitOptions(value);
                const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "板材", checkedItems, multi: false}});
                if (Array.isArray(result)) {
                    (data as any)[key] = joinOptions(result);
                }
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

    getAnchorValue(axis: "x" | "y") {
        if (axis === "x") {
            const value = this.value[0];
            switch (value) {
                case 0:
                    return "左";
                case 0.5:
                    return "中";
                case 1:
                    return "右";
                default:
                    return value;
            }
        } else if (axis === "y") {
            const value = this.value[1];
            switch (value) {
                case 0:
                    return "下";
                case 0.5:
                    return "中";
                case 1:
                    return "上";
                default:
                    return value;
            }
        }
        return "";
    }

    isEmpty(value: any) {
        if (!this.info.showEmpty) {
            return false;
        }
        return [null, undefined, ""].includes(value);
    }
}
