import {AbstractControlOptions} from "@angular/forms";

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

export interface PromptData {
  type?: string;
  hint?: string;
  label?: string;
  value?: string;
  placeholder?: string;
  validators?: AbstractControlOptions["validators"];
  options?: {value: string; label?: string}[];
}

export interface PromptMessageData extends BaseMessageData {
  type: "prompt";
  promptData?: PromptData;
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
  | PromptMessageData
  | BookMessageData
  | EditorMessageData
  | ButtonMessageData
  | IFrameMessageData;

export interface MessageDataMap {
  alert: AlertMessageData;
  confirm: ConfirmMessageData;
  prompt: PromptMessageData;
  book: BookMessageData;
  editor: EditorMessageData;
  button: ButtonMessageData;
  iframe: IFrameMessageData;
}
