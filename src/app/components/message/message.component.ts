import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";

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

	constructor(public dialogRef: MatDialogRef<MessageComponent, boolean | string>, @Inject(MAT_DIALOG_DATA) public data: MessageData) {}

	ngOnInit() {
		const {content} = this.data;
		console.log(this.data);
		if (content instanceof Error) {
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
