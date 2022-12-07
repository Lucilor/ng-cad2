import {AfterViewInit, Component, ElementRef, HostBinding, Input, ViewChild} from "@angular/core";
import {FormControl, ValidationErrors} from "@angular/forms";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {ErrorStateMatcher} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {joinOptions, splitOptions} from "@app/app.common";
import {ColoredObject} from "@cad-viewer";
import {openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {Utils} from "@mixins/utils.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {ObjectOf, timeout} from "@utils";
import {isEmpty} from "lodash";
import {Color} from "ngx-color";
import {ChromeComponent} from "ngx-color/chrome";
import {InputInfo, InputInfoBase, InputInfoTypeMap} from "./types";

@Component({
  selector: "app-input",
  templateUrl: "./input.component.html",
  styleUrls: ["./input.component.scss"]
})
export class InputComponent extends Utils() implements AfterViewInit {
  suffixIconsType!: SuffixIconsType;
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
    if ("value" in value) {
      const {data, key} = this.model;
      if (data && typeof data === "object" && key) {
        data[key] = value.value;
      }
    }
    if (value.type === "select" || value.type === "selectMulti" || value.type === "string") {
      this.options = (value.options || []).map((v) => {
        if (typeof v === "string") {
          return {value: v, label: v};
        }
        return {label: v.label || v.value, value: v.value};
      });
    }
    this.class = [];
    if (typeof value.label === "string" && value.label && !value.label.includes(" ")) {
      this.class.push(value.label);
    }
    if (value.readonly) {
      this.class.push("readonly");
    }
    if (value.disabled) {
      this.class.push("disabled");
    }
    if (value.class) {
      if (Array.isArray(value.class)) {
        this.class.push(...value.class);
      } else {
        this.class.push(value.class);
      }
    }
    this.validateValue();
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

  get editable() {
    return !this.info.readonly && !this.info.disabled;
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
    const fixedOptions = this.info.type === "string" ? this.info.fixedOptions || [] : [];
    return this.options.filter(({value, label}) => {
      if (fixedOptions.includes(value) || fixedOptions.includes(label)) {
        return true;
      }
      return value.includes(val) || label.includes(val);
    });
  }

  get optionText() {
    const info = this.info;
    if (info.type === "select" || info.type === "selectMulti") {
      if (typeof info.optionText === "function") {
        return info.optionText(this.value);
      }
      return info.optionText;
    }
    return "";
  }

  get anchorStr() {
    const value = this.value;
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    return "";
  }

  colorValue = "";
  colorBg = "";
  colorText = "";

  @HostBinding("class")
  class: string[] = [];

  @ViewChild("formField", {read: ElementRef}) formField?: ElementRef<HTMLElement>;
  @ViewChild("colorChrome") colorChrome?: ChromeComponent;
  errors: ValidationErrors | null = null;
  get errorMsg(): string {
    if (!this.errors) {
      return "";
    }
    for (const key in this.errors) {
      const value = this.errors[key];
      let msg = "";
      if (typeof value === "string") {
        msg = value;
      } else {
        msg = key;
      }
      if (msg === "required") {
        return `${this.info.label}不能为空`;
      }
      return msg;
    }
    return "";
  }
  errorStateMatcher: ErrorStateMatcher = {
    isErrorState: () => !this.isValid()
  };

  constructor(private message: MessageService, private dialog: MatDialog, private status: AppStatusService) {
    super();
  }

  async ngAfterViewInit() {
    if (this.info.autoFocus) {
      await timeout(100);
      const el = this.formField?.nativeElement.querySelector("input, textarea");
      if (el instanceof HTMLElement) {
        el.focus();
      }
    }
    if (this.colorChrome) {
      await timeout(0);
      this.setColor(this.colorChrome);
    }
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
    this.validateValue(value);
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
      case "selectMulti":
        info.onChange?.(value);
        break;
      case "coordinate":
        info.onChange?.(value);
        break;
      case "color":
        info.onChange?.(value);
        this.setColor(value);
        break;
      default:
        break;
    }
  }

  validateValue(value = this.value) {
    const validators = this.info.validators;
    if (!validators) {
      return null;
    }
    const control = new FormControl(value, validators);
    control.updateValueAndValidity();
    this.errors = control.errors;
    return this.errors;
  }

  isValid() {
    return isEmpty(this.errors);
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

  setColor(color: Color) {
    const value = color.hex;
    this.colorText = value.toUpperCase();
    try {
      const c = new ColoredObject(value);
      if (c.getColor().isLight()) {
        this.colorBg = "black";
      } else {
        this.colorBg = "white";
      }
      this.colorValue = value;
    } catch (error) {
      this.colorValue = "black";
      this.colorBg = "white";
    }
  }

  clearOption() {
    if (this.info.type === "select") {
      this.value = null;
    } else if (this.info.type === "selectMulti") {
      this.value = [];
    }
  }
}

interface SuffixIconsType {
  $implicit: InputInfoBase["suffixIcons"];
}
