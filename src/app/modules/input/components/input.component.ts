import {AfterViewInit, Component, ElementRef, HostBinding, Input, ViewChild} from "@angular/core";
import {FormControl, ValidationErrors} from "@angular/forms";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {ErrorStateMatcher} from "@angular/material/core";
import {MatDialog} from "@angular/material/dialog";
import {joinOptions, splitOptions} from "@app/app.common";
import {CadOptionsInput, openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {Utils} from "@mixins/utils.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {levenshtein, ObjectOf, timeout} from "@utils";
import Color2 from "color";
import csstype from "csstype";
import {isEmpty, isEqual} from "lodash";
import {Color} from "ngx-color";
import {ChromeComponent} from "ngx-color/chrome";
import {BehaviorSubject} from "rxjs";
import {InputInfo, InputInfoBase, InputInfoTypeMap, InputInfoWithOptions} from "./input.types";

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
      this.value = value.value;
    }
    const type = value.type;
    if (type === "select" || type === "selectMulti" || type === "string" || type === "number") {
      this.options = (value.options || []).map((v) => {
        if (typeof v === "string") {
          return {value: v, label: v};
        }
        if (typeof v === "number") {
          return {value: String(v), label: String(v)};
        }
        return {label: v.label || String(v.value), value: String(v.value)};
      });
    }
    this.displayValue = null;
    if (type === "string") {
      if (value.optionInputOnly && !value.options) {
        value.readonly = true;
        if (typeof value.displayValue === "function") {
          this.displayValue = value.displayValue();
        } else if (value.displayValue) {
          this.displayValue = value.displayValue;
        }
      }
    }
    this.class = [type];
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
    this.style = value.styles || {};
    if (value.initialValidate) {
      this.validateValue();
    }
    this.valueChange$.next(this.value);
  }
  onChangeDelayTime = 200;
  onChangeDelay: {timeoutId: number} | null = null;

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
    const type = this.info.type;
    if (type === "color") {
      this.setColor(val);
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

  get hint() {
    const hint = this.info.hint;
    if (typeof hint === "function") {
      return hint();
    }
    return hint || "";
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

  colorBg = "";
  colorText = "";
  get colorStr() {
    const value = this.value;
    if (typeof value === "string") {
      return value;
    }
    return value?.hex || "";
  }
  get colorOptions() {
    const {info} = this;
    if (info.type !== "color" || !info.options) {
      return [];
    }
    return info.options.map((v) => (typeof v === "string" ? v : new Color2(v).hex()));
  }

  displayValue: string | null = null;

  @HostBinding("class") class: string[] = [];
  @HostBinding("style") style: csstype.Properties = {};

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

  valueChange$ = new BehaviorSubject<any>(null);
  filteredOptions$ = new BehaviorSubject<InputComponent["options"]>([]);

  constructor(private message: MessageService, private dialog: MatDialog) {
    super();
    this.valueChange$.subscribe((val) => {
      const info = this.info;
      const {fixedOptions, filterValuesGetter, optionsDisplayLimit} = info as InputInfoWithOptions;
      let sortOptions: boolean;
      const getFilterValues = (option: (typeof this.options)[number]) => {
        let values: string[] = [];
        if (typeof filterValuesGetter === "function") {
          values = filterValuesGetter(option);
        } else {
          values = [option.value, option.label];
        }
        return values;
      };
      let options: typeof this.options;
      if (val) {
        options = this.options.filter((option) => {
          const values = getFilterValues(option);
          for (const v of values) {
            if (v.includes(val) || (fixedOptions && fixedOptions.includes(v))) {
              return true;
            }
          }
          return false;
        });
        sortOptions = true;
      } else {
        options = this.options;
        sortOptions = false;
      }
      if (typeof optionsDisplayLimit === "number") {
        options = options.slice(0, optionsDisplayLimit);
      }
      if (sortOptions) {
        const cache: ObjectOf<number> = {};
        const valueTarget = this.value;
        const getLevenshtein = (option: (typeof options)[number]) => {
          const values = getFilterValues(option);
          let dMin = Infinity;
          for (const v of values) {
            let d: number;
            if (v in cache) {
              d = cache[v];
            } else {
              d = levenshtein(v, valueTarget);
              cache[v] = d;
            }
            dMin = Math.min(dMin, d);
          }
          return dMin;
        };
        options.sort((a, b) => {
          const d1 = getLevenshtein(a);
          const d2 = getLevenshtein(b);
          return d1 - d2;
        });
      }
      this.filteredOptions$.next(options);
    });
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

  clear() {
    const value = this.value;
    if (value === undefined || value === null) {
      return;
    }
    let toChange: any;
    switch (typeof value) {
      case "string":
        toChange = "";
        break;
      case "number":
        toChange = 0;
        break;
      case "object":
        if (Array.isArray(value)) {
          toChange = [];
        } else {
          toChange = null;
        }
        break;
      default:
        toChange = null;
    }
    if (!isEqual(value, toChange)) {
      this.value = toChange;
      this.onInput(toChange);
      this.onChange(toChange);
    }
  }

  copy() {
    const copy = async (str: string) => {
      await navigator.clipboard.writeText(str);
      await this.message.snack(`${this.info.label}已复制`);
    };
    const value = this.value;
    switch (typeof value) {
      case "string":
        copy(value);
        break;
      case "number":
        copy(String(value));
        break;
      default:
        copy(JSON.stringify(value));
    }
  }

  async onChange(value = this.value, isAutocomplete = false) {
    const info = this.info;
    this.validateValue(value);
    switch (info.type) {
      case "string":
        if (value && info.options && !isAutocomplete) {
          const timeoutId = window.setTimeout(() => {
            if (info.optionInputOnly && !this.options.find((v) => v.value === value)) {
              this.value = "";
            }
            this.onChange();
          }, this.onChangeDelayTime);
          this.onChangeDelay = {timeoutId};
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
        break;
      default:
        break;
    }
  }

  onColorChange(color: Color) {
    this.value = color;
    this.onChange(color);
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
    if (this.onChangeDelay) {
      window.clearTimeout(this.onChangeDelay.timeoutId);
      this.onChangeDelay = null;
    }
    this.onChange(event.option.value, true);
  }

  onInput(value = this.value) {
    switch (this.info.type) {
      case "string":
        this.info.onInput?.(value);
        break;
      case "number":
        this.info.onInput?.(value);
        break;
      default:
        break;
    }
    this.valueChange$.next(value);
  }

  onBlur() {
    this.validateValue();
  }

  async selectOptions(key?: keyof any, optionKey?: string) {
    const data = this.model.data;
    if (!key || !optionKey) {
      return;
    }
    let optionsUseId = false;
    let isSingleOption = false;
    let optionInputOnly = false;
    const info = this.info;
    if (info.type === "string") {
      optionsUseId = !!info.optionsUseId;
      isSingleOption = !!info.isSingleOption;
      optionInputOnly = !!info.optionInputOnly;
    }
    const value = (data as any)[key];
    const isObject = value && typeof value === "object";
    const checked = splitOptions(isObject ? value[optionKey] : value);
    const dialogData: CadOptionsInput = {data, name: optionKey, multi: !isSingleOption};
    if (optionsUseId) {
      dialogData.checkedVids = checked.map((v) => Number(v));
    } else {
      dialogData.checkedItems = checked;
    }
    const result = await openCadOptionsDialog(this.dialog, {data: dialogData});
    if (result) {
      let options: string[];
      if (optionsUseId) {
        options = result.map((v) => String(v.vid));
        if (optionInputOnly) {
          this.displayValue = joinOptions(result.map((v) => v.mingzi));
        }
      } else {
        options = result.map((v) => v.mingzi);
      }
      if (isObject) {
        data[key][optionKey] = joinOptions(options);
      } else {
        data[key] = joinOptions(options);
      }
      this.validateValue();
    }
  }

  asObject(val: any): ObjectOf<any> {
    if (val && typeof val === "object") {
      return val;
    }
    return {};
  }

  cast<T extends InputInfo["type"]>(_: T, data: InputInfo) {
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

  setColor(color: Color | string | undefined | null) {
    const value = typeof color === "string" ? color : color?.hex;
    try {
      const c = new Color2(value);
      if (c.isLight()) {
        this.colorBg = "black";
      } else {
        this.colorBg = "white";
      }
    } catch (error) {
      this.colorBg = "white";
    }
  }

  returnZero() {
    return 0;
  }
}

interface SuffixIconsType {
  $implicit: InputInfoBase["suffixIcons"];
}
