import {Injectable} from "@angular/core";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {InputInfo} from "@modules/input/components/types";
import {lastValueFrom} from "rxjs";
import {
  AlertMessageData,
  BookMessageData,
  ButtonMessageData,
  ConfirmMessageData,
  EditorMessageData,
  FormMessageData,
  IFrameMessageData,
  MessageData,
  MessageDataMap,
  MessageOutput
} from "../components/message/message-types";
import {MessageComponent} from "../components/message/message.component";

export type MessageDataParams<T> = Omit<T, "type">;
export type MessageDataParams2<T> = Omit<MatDialogConfig<T>, "data">;

@Injectable({
  providedIn: "root"
})
export class MessageService {
  constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {}

  async open(config: MatDialogConfig<MessageData>) {
    config = {width: "40%", ...config};
    const data = config.data;
    if (data?.disableCancel || config.disableClose === undefined) {
      config.disableClose = true;
    }
    const ref = this.dialog.open<MessageComponent, MessageData, MessageOutput>(MessageComponent, config);
    return await lastValueFrom(ref.afterClosed());
  }

  private _getData<T extends MessageData, K extends MessageData["type"]>(data: string | MessageDataParams<T>, type: K): MessageDataMap[K] {
    if (typeof data === "string") {
      data = {content: data} as MessageDataParams<T>;
    }
    return {...data, type} as MessageData as MessageDataMap[K];
  }

  async alert(data: string | MessageDataParams<AlertMessageData>, others: MessageDataParams2<AlertMessageData> = {}) {
    await this.open({data: this._getData(data, "alert"), ...others});
  }

  async error(message: string, others: MessageDataParams2<AlertMessageData> = {}) {
    await this.alert({content: new Error(message)}, others);
  }

  async confirm(data: string | MessageDataParams<ConfirmMessageData>, others: MessageDataParams2<ConfirmMessageData> = {}) {
    return !!(await this.open({data: this._getData(data, "confirm"), ...others}));
  }

  async form(data: InputInfo[] | MessageDataParams<FormMessageData>, others: MessageDataParams2<FormMessageData> = {}) {
    if (Array.isArray(data)) {
      data = {inputs: data};
    }
    const result = await this.open({data: this._getData(data, "form"), ...others});
    if (result && typeof result === "object") {
      return result;
    }
    return null;
  }

  // async prompt(...args:any[]) {
  //   return "";
  // }

  async prompt(
    info: InputInfo,
    data?: Omit<MessageDataParams<FormMessageData>, "inputs">,
    others: MessageDataParams2<FormMessageData> = {}
  ) {
    const result = await this.form({inputs: [info], ...data}, others);
    if (result && typeof result === "object") {
      return Object.values(result)[0];
    }
    return null;
  }

  async book(data: string | MessageDataParams<BookMessageData>, others: MessageDataParams2<BookMessageData> = {}) {
    await this.open({data: this._getData(data, "book"), width: "80vw", ...others});
  }

  async editor(data: string | MessageDataParams<EditorMessageData>, others: MessageDataParams2<EditorMessageData> = {}) {
    return String(await this.open({data: this._getData(data, "editor"), width: "80vw", ...others}));
  }

  async button(data: string | MessageDataParams<ButtonMessageData>, others: MessageDataParams2<ButtonMessageData> = {}) {
    return String(await this.open({data: this._getData(data, "button"), ...others}));
  }

  async iframe(data: string | MessageDataParams<IFrameMessageData>, others: MessageDataParams2<IFrameMessageData> = {}) {
    return String(await this.open({data: this._getData(data, "iframe"), width: "100vw", height: "100vh", ...others}));
  }

  async snack(message: string, action?: string, config?: MatSnackBarConfig) {
    const snackBarRef = this.snackBar.open(message, action, config);
    try {
      await lastValueFrom(snackBarRef.onAction());
    } catch (error) {}
    if (!action) {
      snackBarRef.dismiss();
    }
  }
}
