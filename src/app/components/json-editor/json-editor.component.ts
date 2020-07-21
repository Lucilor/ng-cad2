import {Component, OnInit, ViewChild, Inject} from "@angular/core";
import {JsonEditorOptions, JsonEditorComponent as JsonEditorComponent2} from "ang-jsoneditor";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {openMessageDialog} from "../message/message.component";

interface JsonEditorData {
	json?: any;
	options?: JsonEditorOptions;
}

@Component({
	selector: "app-json-editor",
	templateUrl: "./json-editor.component.html",
	styleUrls: ["./json-editor.component.scss"]
})
export class JsonEditorComponent implements OnInit {
	@ViewChild(JsonEditorComponent2, {static: false}) editor: JsonEditorComponent2;

	constructor(
		public dialogRef: MatDialogRef<JsonEditorComponent, JSON>,
		@Inject(MAT_DIALOG_DATA) public data: JsonEditorData,
		private dialog: MatDialog
	) {}

	ngOnInit() {
		if (!this.data.json) {
			this.data.json = {};
		}
		if (!this.data.options) {
			this.data.options = new JsonEditorOptions();
			this.data.options.modes = ["code", "text", "tree", "view"];
			this.data.options.mode = "code";
			this.data.options.onChange = () => {
				// this.editor
			};
		}
	}

	submit() {
		const valid = this.editor.isValidJson();
		if (valid) {
			this.dialogRef.close(this.editor.get());
		} else {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "无效的json"}});
		}
	}

	cancle() {
		this.dialogRef.close();
	}
}

export function openJsonEditorDialog(dialog: MatDialog, config: MatDialogConfig<JsonEditorData>) {
	return dialog.open<JsonEditorComponent, JsonEditorData, JSON>(JsonEditorComponent, config);
}
