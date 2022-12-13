import {InputInfo} from "@modules/input/components/types";
import {ObjectOf} from "@utils";

export interface BaseMessageData {
  title?: string;
  content?: any;
  disableCancel?: boolean;
  titleClass?: string;
  contentClass?: string;
}

export interface AlertMessageData extends BaseMessageData {
  type: "alert";
  btnTexts?: {ok?: string};
}

export interface ConfirmMessageData extends BaseMessageData {
  type: "confirm";
  btnTexts?: {yes?: string; no?: string};
}

export interface ButtonMessageData extends BaseMessageData {
  type: "button";
  buttons: (string | {label: string; value: string})[];
}

export interface FormMessageData extends BaseMessageData {
  type: "form";
  inputs: InputInfo[];
  btnTexts?: {submit?: string; cancel?: string};
}

export interface BookPageData {
  title?: string;
  content: string;
}

export type BookData = BookPageData[];

export interface BookMessageData extends BaseMessageData {
  type: "book";
  bookData: BookData;
  btnTexts?: {prev?: string; next?: string; exit?: string};
}

export interface EditorMessageData extends BaseMessageData {
  type: "editor";
  editable?: boolean;
  btnTexts?: {submit?: string; cancel?: string};
}

export interface IFrameMessageData extends BaseMessageData {
  type: "iframe";
  content: string;
}

export type MessageData =
  | AlertMessageData
  | ConfirmMessageData
  | FormMessageData
  | BookMessageData
  | EditorMessageData
  | ButtonMessageData
  | IFrameMessageData;

export interface MessageDataMap {
  alert: AlertMessageData;
  confirm: ConfirmMessageData;
  form: FormMessageData;
  book: BookMessageData;
  editor: EditorMessageData;
  button: ButtonMessageData;
  iframe: IFrameMessageData;
}

export type MessageOutput = boolean | string | ObjectOf<any> | null | undefined;
