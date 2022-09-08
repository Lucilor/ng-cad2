import {AbstractControlOptions} from "@angular/forms";
import {FloatLabelType} from "@angular/material/form-field";

export interface InputInfoBase<T = any> {
    label: string;
    floatLabel?: FloatLabelType;
    model?: {data: T | (() => T); key: string};
    value?: any | (() => any);
    readonly?: boolean;
    copyable?: boolean;
    disabled?: boolean;
    suffixIcons?: {name: string; onClick: () => void}[];
    hint?: string;
    autocomplete?: "on" | "off";
    showEmpty?: boolean;
}

export interface InputInfoString<T = any> extends InputInfoBase<T> {
    type: "string";
    optionKey?: string;
    textarea?: {autosize?: {minRows?: number; maxRows?: number}};
    onInput?: (val: string) => void;
    onChange?: (val: string) => void;
    validators?: AbstractControlOptions["validators"];
    options?: InputInfoOptions;
    fixedOptions?: string[];
    optionInputOnly?: boolean;
}

export interface InputInfoNumber<T = any> extends InputInfoBase<T> {
    type: "number";
    step?: number;
    min?: number;
    max?: number;
    onInput?: (val: number) => void;
    onChange?: (val: number) => void;
}

export interface InputInfoObject<T = any> extends InputInfoBase<T> {
    type: "object";
    isCadOptions?: boolean;
    isOneItem?: boolean;
}

export interface InputInfoArray<T = any> extends InputInfoBase<T> {
    type: "array";
}

export interface InputInfoBoolean<T = any> extends InputInfoBase<T> {
    type: "boolean";
    onChange?: (val: boolean) => void;
}

export interface InputInfoSelect<T = any> extends InputInfoBase<T> {
    type: "select";
    options: InputInfoOptions;
    onChange?: (val: string) => void;
}

export interface InputInfoCoordinate<T = any> extends InputInfoBase<T> {
    type: "coordinate";
    compact?: boolean;
    labelX?: string;
    labelY?: string;
    onChange?: (val: [number, number]) => void;
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
    | InputInfoCoordinate<T>
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
    coordinate: InputInfoCoordinate;
    group: InputInfoGroup;
}

export type InputInfoOptions = ({value: string; label?: string} | string)[];
