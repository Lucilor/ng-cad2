import {Injectable} from "@angular/core";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {lastValueFrom} from "rxjs";
import {
    MessageData,
    MessageDataMap,
    AlertMessageData,
    ConfirmMessageData,
    PromptMessageData,
    BookMessageData,
    EditorMessageData,
    ButtonMessageData
} from "../components/message/message-types";
import {MessageComponent} from "../components/message/message.component";
import {MessageModule} from "../message.module";

export type MessageDataParams<T> = Partial<Omit<T, "type">>;

@Injectable({
    providedIn: MessageModule
})
export class MessageService {
    constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {}

    async open(config: MatDialogConfig<MessageData>) {
        const ref = this.dialog.open<MessageComponent, MessageData, boolean | string>(MessageComponent, config);
        return await lastValueFrom(ref.afterClosed());
    }

    private _getData<T extends MessageData, K extends MessageData["type"]>(
        data: string | MessageDataParams<T>,
        type: K
    ): MessageDataMap[K] {
        if (typeof data === "string") {
            data = {content: data} as MessageDataParams<T>;
        }
        return {...data, type} as MessageData as MessageDataMap[K];
    }

    async alert(data: string | MessageDataParams<AlertMessageData>, others: Omit<MatDialogConfig<AlertMessageData>, "data"> = {}) {
        await this.open({data: this._getData(data, "alert"), ...others});
    }

    async confirm(data: string | MessageDataParams<ConfirmMessageData>) {
        return !!(await this.open({data: this._getData(data, "confirm")}));
    }

    async prompt(data: string | MessageDataParams<PromptMessageData>, others: Omit<MatDialogConfig<PromptMessageData>, "data"> = {}) {
        const result = await this.open({data: this._getData(data, "prompt"), ...others});
        if (typeof result === "string") {
            return result;
        }
        return null;
    }

    async book(data: string | MessageDataParams<BookMessageData>) {
        await this.open({data: this._getData(data, "book"), width: "80vw", height: "65vh"});
    }

    async editor(data: string | MessageDataParams<EditorMessageData>) {
        return String(await this.open({data: this._getData(data, "editor")}));
    }

    async button(data: string | MessageDataParams<ButtonMessageData>) {
        return String(await this.open({data: this._getData(data, "button")}));
    }

    async snack(message: string, action?: string, config?: MatSnackBarConfig) {
        const snackBarRef = this.snackBar.open(message, action, config);
        await lastValueFrom(snackBarRef.onAction());
        if (!action) {
            snackBarRef.dismiss();
        }
    }
}
