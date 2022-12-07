import {Injectable} from "@angular/core";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {lastValueFrom} from "rxjs";
import {
  AlertMessageData,
  BookMessageData,
  ButtonMessageData,
  ConfirmMessageData,
  EditorMessageData,
  IFrameMessageData,
  MessageData,
  MessageDataMap,
  PromptMessageData
} from "../components/message/message-types";
import {MessageComponent} from "../components/message/message.component";

export type MessageDataParams<T> = Omit<T, "type">;

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
    const ref = this.dialog.open<MessageComponent, MessageData, boolean | string>(MessageComponent, config);
    return await lastValueFrom(ref.afterClosed());
  }

  private _getData<T extends MessageData, K extends MessageData["type"]>(data: string | MessageDataParams<T>, type: K): MessageDataMap[K] {
    if (typeof data === "string") {
      data = {content: data} as MessageDataParams<T>;
    }
    return {...data, type} as MessageData as MessageDataMap[K];
  }

  async alert(data: string | MessageDataParams<AlertMessageData>, others: Omit<MatDialogConfig<AlertMessageData>, "data"> = {}) {
    await this.open({data: this._getData(data, "alert"), ...others});
  }

  async error(message: string, others: Omit<MatDialogConfig<AlertMessageData>, "data"> = {}) {
    await this.alert({content: new Error(message)}, others);
  }

  async confirm(data: string | MessageDataParams<ConfirmMessageData>, others: Omit<MatDialogConfig<AlertMessageData>, "data"> = {}) {
    return !!(await this.open({data: this._getData(data, "confirm"), ...others}));
  }

  async prompt(data: string | MessageDataParams<PromptMessageData>, others: Omit<MatDialogConfig<PromptMessageData>, "data"> = {}) {
    const result = await this.open({data: this._getData(data, "prompt"), ...others});
    if (typeof result === "string") {
      return result;
    }
    return null;
  }

  async book(data: string | MessageDataParams<BookMessageData>, others: Omit<MatDialogConfig<BookMessageData>, "data"> = {}) {
    await this.open({data: this._getData(data, "book"), width: "80vw", ...others});
  }

  async editor(data: string | MessageDataParams<EditorMessageData>, others: Omit<MatDialogConfig<EditorMessageData>, "data"> = {}) {
    return String(await this.open({data: this._getData(data, "editor"), width: "80vw", ...others}));
  }

  async button(data: string | MessageDataParams<ButtonMessageData>, others: Omit<MatDialogConfig<ButtonMessageData>, "data"> = {}) {
    return String(await this.open({data: this._getData(data, "button"), ...others}));
  }

  async iframe(data: string | MessageDataParams<IFrameMessageData>, others: Omit<MatDialogConfig<IFrameMessageData>, "data"> = {}) {
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
