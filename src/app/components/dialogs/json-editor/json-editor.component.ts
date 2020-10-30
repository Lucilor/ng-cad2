import {Inject, ViewChild} from "@angular/core";
import {Component, OnInit} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {JsonEditorComponent as JsonEditorComponent2, JsonEditorOptions} from "ang-jsoneditor";

export interface JsonEditorData {
	json?: any;
	options?: Partial<JsonEditorOptions>;
}

@Component({
	selector: "app-json-editor",
	templateUrl: "./json-editor.component.html",
	styleUrls: ["./json-editor.component.scss"]
})
export class JsonEditorComponent implements OnInit {
	@ViewChild(JsonEditorComponent2, {static: false}) editor?: JsonEditorComponent2;

	get options() {
		return this.data.options as JsonEditorOptions;
	}

	constructor(public dialogRef: MatDialogRef<JsonEditorComponent, any>, @Inject(MAT_DIALOG_DATA) public data: JsonEditorData) {}

	ngOnInit() {
		if (!this.data.json) {
			this.data.json = {};
		}
		if (!this.data.options) {
			this.data.options = new JsonEditorOptions();
			this.data.options.modes = ["code", "text", "tree", "view"];
			this.data.options.mode = "code";
			// this.data.options.onChange = () => {
			// 	this.editor
			// };
		}
	}

	submit() {
		if (!this.editor) {
			this.dialogRef.close();
			return;
		}
		const valid = this.editor.isValidJson();
		if (valid) {
			this.dialogRef.close(this.editor.get());
		}
	}

	cancle() {
		this.dialogRef.close();
	}
}

export function openJsonEditorDialog(dialog: MatDialog, config: MatDialogConfig<JsonEditorData>) {
	return dialog.open<JsonEditorComponent, JsonEditorData, any>(JsonEditorComponent, config);
}
