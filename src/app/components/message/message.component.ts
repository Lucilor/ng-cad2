import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";

export interface MessageData {
	title?: string;
	content?: any;
	type?: "alert" | "confirm" | "prompt";
}

@Component({
	selector: "app-message",
	templateUrl: "./message.component.html",
	styleUrls: ["./message.component.scss"]
})
export class MessageComponent implements OnInit {
	input = "";
	titleHTML: SafeHtml;
	contentHTML: SafeHtml;

	constructor(
		public dialogRef: MatDialogRef<MessageComponent, boolean | string>,
		private sanitizer: DomSanitizer,
		@Inject(MAT_DIALOG_DATA) public data: MessageData
	) {}

	ngOnInit() {
		const {title, content} = this.data;
		if (title === null || title === undefined) {
			this.data.title = "";
		}
		this.titleHTML = this.sanitizer.bypassSecurityTrustHtml(this.data.title);
		if (content === null || content === undefined) {
			this.data.content = "";
		} else if (content instanceof Error) {
			this.data.title = "Oops!";
			this.data.content = content.message;
			console.warn(content);
		} else if (typeof content !== "string") {
			try {
				this.data.content = JSON.stringify(content);
			} catch (error) {
				console.warn(error);
			}
		}
		this.contentHTML = this.sanitizer.bypassSecurityTrustHtml(this.data.content);
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
}
