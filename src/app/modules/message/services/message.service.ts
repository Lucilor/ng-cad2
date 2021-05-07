import {Injectable} from "@angular/core";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
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
        return await ref.afterClosed().toPromise();
    }

    private _getData<T extends MessageData, K extends MessageData["type"]>(
        data: string | MessageDataParams<T>,
        type: K
    ): MessageDataMap[K] {
        if (typeof data === "string") {
            data = {content: data} as MessageDataParams<T>;
        }
        return ({...data, type} as MessageData) as MessageDataMap[K];
    }

    async alert(data: string | MessageDataParams<AlertMessageData>) {
        return await this.open({data: this._getData(data, "alert")});
    }

    async confirm(data: string | MessageDataParams<ConfirmMessageData>) {
        return await this.open({data: this._getData(data, "confirm")});
    }

    async prompt(data: string | MessageDataParams<PromptMessageData>) {
        return await this.open({data: this._getData(data, "prompt")});
    }

    async book(data: string | MessageDataParams<BookMessageData>) {
        return await this.open({data: this._getData(data, "book"), width: "80vw", height: "65vh"});
    }

    async editor(data: string | MessageDataParams<EditorMessageData>) {
        return await this.open({data: this._getData(data, "editor")});
    }

    async button(data: string | MessageDataParams<ButtonMessageData>) {
        return await this.open({data: this._getData(data, "button")});
    }

    snack(message: string, action?: string, config?: MatSnackBarConfig) {
        this.snackBar.open(message, action, config);
    }
}
