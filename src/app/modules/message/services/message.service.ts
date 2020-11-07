import {Injectable} from "@angular/core";
import {MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {BookData, MessageData, PromptData} from "../components/message/message-types";
import {MessageComponent} from "../components/message/message.component";
import {MessageModule} from "../message.module";

@Injectable({
    providedIn: MessageModule
})
export class MessageService {
    constructor(private dialog: MatDialog) {}

    async open(config: MatDialogConfig<MessageData>) {
        const ref = this.dialog.open<MessageComponent, MessageData, boolean | string>(MessageComponent, config);
        return await ref.afterClosed().toPromise();
    }

    async alert(content: string, title?: string) {
        return await this.open({data: {type: "alert", content, title}});
    }

    async confirm(content: string, title?: string) {
        return await this.open({data: {type: "confirm", content, title}});
    }

    async prompt(promptData?: PromptData, content?: string, title?: string) {
        return await this.open({data: {type: "prompt", promptData, content, title}});
    }

    async book(bookData: BookData, content?: string, title?: string) {
        return await this.open({data: {type: "book", bookData, content, title}});
    }
}
