import {HttpErrorResponse} from "@angular/common/http";
import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {clamp} from "lodash";
import {MessageData, PromptData} from "./message-types";

@Component({
    selector: "app-message",
    templateUrl: "./message.component.html",
    styleUrls: ["./message.component.scss"]
})
export class MessageComponent implements OnInit {
    input = "";
    titleHTML: SafeHtml = "";
    subTitleHTML: SafeHtml = "";
    contentHTML: SafeHtml = "";
    page = 0;

    get promptData() {
        let result: PromptData = {};
        if (this.data.type === "prompt" && typeof this.data.promptData === "object") {
            result = this.data.promptData;
        }
        return result;
    }

    get minPage() {
        return 0;
    }
    get maxPage() {
        if (this.data.type === "book") {
            return this.data.bookData.length - 1;
        }
        return 0;
    }

    constructor(
        public dialogRef: MatDialogRef<MessageComponent, boolean | string>,
        private sanitizer: DomSanitizer,
        @Inject(MAT_DIALOG_DATA) public data: MessageData
    ) {}

    ngOnInit() {
        const data = this.data;
        if (data.title === null || data.title === undefined) {
            data.title = "";
        }
        this.titleHTML = this.sanitizer.bypassSecurityTrustHtml(this.data.title || "");
        if (data.content === null || data.content === undefined) {
            data.content = "";
        } else if (data.content instanceof Error) {
            data.title = "Oops!";
            data.content = data.content.message;
            console.warn(data.content);
        } else if (data.content instanceof HttpErrorResponse) {
            data.title = "网络错误";
            if (typeof data.content.error === "string") {
                data.content = data.content.error;
            } else if (typeof data.content.error?.text === "string") {
                data.content = data.content.error.text;
            } else {
                data.content = "未知网络错误";
            }
        } else if (typeof data.content !== "string") {
            try {
                data.content = JSON.stringify(data.content);
            } catch (error) {
                console.warn(error);
            }
        }
        this.contentHTML = this.sanitizer.bypassSecurityTrustHtml(data.content);

        if (data.type === "prompt") {
            if (!data.promptData) {
                data.promptData = {};
            }
            data.promptData = {
                ...{
                    type: "text",
                    hint: "",
                    value: "",
                    placeholder: "请输入"
                },
                ...data.promptData
            };
        }
        if (data.type === "book") {
            if (!data.bookData) {
                data.bookData = [];
            }
            this.setPage(0);
        }
    }

    submit() {
        if (this.data.type === "confirm") {
            this.dialogRef.close(true);
        } else if (this.data.type === "prompt") {
            this.dialogRef.close(this.input);
        } else {
            this.cancle();
        }
    }

    cancle() {
        this.dialogRef.close(false);
    }

    setPage(page: number) {
        if (this.data.type !== "book") {
            return;
        }
        if (this.data.bookData) {
            this.page = clamp(page, this.minPage, this.maxPage);
            const data = this.data.bookData[this.page];
            this.contentHTML = this.sanitizer.bypassSecurityTrustHtml(data.content);
            if (data.title) {
                this.subTitleHTML = this.sanitizer.bypassSecurityTrustHtml(data.title);
            }
        } else {
            this.page = 0;
        }
    }
}
