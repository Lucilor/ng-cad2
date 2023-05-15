import {AbstractControlOptions} from "@angular/forms";
import {FloatLabelType} from "@angular/material/form-field";
import {ObjectOf} from "@utils";
import csstype from "csstype";
import {Color, ColorWrap} from "ngx-color";

type Value<T> = T | ((...args: any[]) => T);

export interface InputInfoBase<T = any> {
  label: string;
  floatLabel?: FloatLabelType;
  model?: {data: T | (() => T); key: keyof T};
  value?: Value<any>;
  readonly?: boolean;
  clearable?: boolean;
  copyable?: boolean;
  disabled?: boolean;
  suffixIcons?: {name: string; onClick: () => void}[];
  hint?: Value<string>;
  autocomplete?: "on" | "off";
  showEmpty?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  class?: string | string[];
  validators?: AbstractControlOptions["validators"];
  initialValidate?: boolean;
  name?: string;
  styles?: csstype.Properties;
}

export interface InputInfoString<T = any> extends InputInfoWithOptions<T, string> {
  type: "string";
  value?: Value<string>;
  optionKey?: string;
  textarea?: {autosize?: {minRows?: number; maxRows?: number}};
  onInput?: (val: string) => void;
  onChange?: (val: string) => void;
}

export interface InputInfoNumber<T = any> extends InputInfoWithOptions<T, number> {
  type: "number";
  value?: Value<number>;
  step?: number;
  min?: number;
  max?: number;
  onInput?: (val: number) => void;
  onChange?: (val: number) => void;
}

export interface InputInfoObject<T = any> extends InputInfoBase<T> {
  type: "object";
  value?: Value<ObjectOf<any>>;
  isCadOptions?: boolean;
  isOneItem?: boolean;
}

export interface InputInfoArray<T = any> extends InputInfoBase<T> {
  type: "array";
  value?: Value<any[]>;
}

export interface InputInfoBoolean<T = any> extends InputInfoBase<T> {
  type: "boolean";
  onChange?: (val: boolean) => void;
}

export interface InputInfoSelect<T = any> extends InputInfoBase<T> {
  type: "select";
  value?: Value<string>;
  options: InputInfoOptions;
  optionText?: string | ((val: string) => string);
  onChange?: (val: string) => void;
}

export interface InputInfoSelectMulti<T = any> extends InputInfoBase<T> {
  type: "selectMulti";
  value?: Value<string[]>;
  options: InputInfoOptions;
  optionText?: string | ((val: string[]) => string);
  onChange?: (val: string[]) => void;
}

export interface InputInfoCoordinate<T = any> extends InputInfoBase<T> {
  type: "coordinate";
  value?: Value<[number, number]>;
  compact?: boolean;
  labelX?: string;
  labelY?: string;
  onChange?: (val: {anchor: [number, number]}) => void;
}

export interface InputInfoColor<T = any> extends InputInfoBase<T> {
  type: "color";
  value?: Value<ColorWrap["color"]>;
  onChange?: (val: Color) => void;
}

export interface InputInfoGroup<T = any> extends InputInfoBase<T> {
  type: "group";
  infos?: InputInfo<T>[];
}

export type InputInfo<T = any> =
  | InputInfoString<T>
  | InputInfoNumber<T>
  | InputInfoObject<T>
  | InputInfoArray<T>
  | InputInfoBoolean<T>
  | InputInfoSelect<T>
  | InputInfoSelectMulti<T>
  | InputInfoCoordinate<T>
  | InputInfoColor<T>
  | InputInfoGroup<T>;

export interface InputInfoTypeMap {
  // eslint-disable-next-line id-blacklist
  string: InputInfoString;
  // eslint-disable-next-line id-blacklist
  number: InputInfoNumber;
  object: InputInfoObject;
  array: InputInfoArray;
  // eslint-disable-next-line id-blacklist
  boolean: InputInfoBoolean;
  select: InputInfoSelect;
  selectMulti: InputInfoSelectMulti;
  coordinate: InputInfoCoordinate;
  color: InputInfoColor;
  group: InputInfoGroup;
}

export interface InputInfoWithOptions<T = any, K = any> extends InputInfoBase<T> {
  options?: InputInfoOptions<K>;
  filterValuesGetter?: (option: InputInfoOption<K>) => string[];
  fixedOptions?: string[];
  optionInputOnly?: boolean;
  optionsDisplayLimit?: number;
}

export type InputInfoOption<T = string> = {value: T; label?: string} | T;

export type InputInfoOptions<T = string> = InputInfoOption<T>[];
