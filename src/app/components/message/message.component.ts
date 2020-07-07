import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";

export interface MessageData {
	title?: string;
	content?: any;
	type?: "alert" | "confirm" | "prompt";
	promptData?: {
		type?: string;
		hint?: string;
		value?: string;
	};
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
		const data = this.data;
		if (data.title === null || data.title === undefined) {
			data.title = "";
		}
		this.titleHTML = this.sanitizer.bypassSecurityTrustHtml(this.data.title);
		if (data.content === null || data.content === undefined) {
			data.content = "";
		} else if (data.content instanceof Error) {
			data.title = "Oops!";
			data.content = data.content.message;
			console.warn(data.content);
		} else if (typeof data.content !== "string") {
			try {
				this.data.content = JSON.stringify(data.content);
			} catch (error) {
				console.warn(error);
			}
		}
		this.contentHTML = this.sanitizer.bypassSecurityTrustHtml(data.content);

		if (this.data.type === "prompt") {
			if (!data.promptData) {
				data.promptData = {};
			}
			const promptData = data.promptData;
			if (typeof promptData.type !== "string") {
				promptData.type = "text";
			}
			if (typeof promptData.hint !== "string") {
				promptData.hint = "";
			}
			if (promptData.value) {
				this.input = promptData.value;
			}
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
}
