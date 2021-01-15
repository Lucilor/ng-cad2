import {ValidatorFn} from "@angular/forms";
import {ObjectOf} from "@src/app/utils";

export interface BaseMessageData {
    title?: string;
    content?: any;
    cancelable?: boolean;
}

export interface PlainMessageData extends BaseMessageData {
    type: "alert" | "confirm";
}

export interface PromptData {
    type?: string;
    hint?: string;
    value?: string;
    placeholder?: string;
    validators?: ValidatorFn | ValidatorFn[] | null;
    errorText?: ObjectOf<string> | string;
}

export interface PromptMessageData extends BaseMessageData {
    type: "prompt";
    promptData?: PromptData;
}

export interface BookPageData {
    title?: string;
    content: string;
}

export type BookData = BookPageData[];

export interface BookMessageData extends BaseMessageData {
    type: "book";
    bookData: BookData;
}

export interface EditorMessageData extends BaseMessageData {
    type: "editor";
    editable: boolean;
}

export type MessageData = PlainMessageData | PromptMessageData | BookMessageData | EditorMessageData;
