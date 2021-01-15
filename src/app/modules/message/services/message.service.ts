import {Injectable} from "@angular/core";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {BookData, MessageData, PromptData} from "../components/message/message-types";
import {MessageComponent} from "../components/message/message.component";
import {MessageModule} from "../message.module";

@Injectable({
    providedIn: MessageModule
})
export class MessageService {
    constructor(private dialog: MatDialog, private snackBar: MatSnackBar) {}

    async open(config: MatDialogConfig<MessageData>) {
        const ref = this.dialog.open<MessageComponent, MessageData, boolean | string>(MessageComponent, config);
        return await ref.afterClosed().toPromise();
    }

    async alert(content: string, title?: string, cancelable = true) {
        return await this.open({data: {type: "alert", content, title, cancelable}});
    }

    async confirm(content: string, title?: string, cancelable = true) {
        return await this.open({data: {type: "confirm", content, title, cancelable}});
    }

    async prompt(promptData?: PromptData, content?: string, title?: string, cancelable = true) {
        return await this.open({data: {type: "prompt", promptData, content, title, cancelable}});
    }

    async book(bookData: BookData, content?: string, title?: string, cancelable = true) {
        return await this.open({data: {type: "book", bookData, content, title, cancelable}});
    }

    async editor(content?: string, title?: string, editable = true, cancelable = true) {
        return await this.open({data: {type: "editor", editable, content, title, cancelable}});
    }

    snack(message: string, action?: string, config?: MatSnackBarConfig) {
        this.snackBar.open(message, action, config);
    }
}
