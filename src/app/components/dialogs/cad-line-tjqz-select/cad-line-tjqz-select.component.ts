import {Component, Inject, OnInit} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {cloneDeep} from "lodash";
import {openCadOptionsDialog} from "../cad-options/cad-options.component";

export type CadLineTjqzSelectData = {key: string; value: string}[];

@Component({
	selector: "app-cad-line-tjqz-select",
	templateUrl: "./cad-line-tjqz-select.component.html",
	styleUrls: ["./cad-line-tjqz-select.component.scss"]
})
export class CadLineTjqzSelectComponent implements OnInit {
	constructor(
		public dialogRef: MatDialogRef<CadLineTjqzSelectComponent, CadLineTjqzSelectData>,
		@Inject(MAT_DIALOG_DATA) public data: CadLineTjqzSelectData,
		private dialog: MatDialog,
		private message: MessageService
	) {
		this.data = cloneDeep(this.data);
	}

	ngOnInit() {}

	async onListClick(item: CadLineTjqzSelectData[0]) {
		const name = item.key;
		const checkedItems = item.value.split("*");
		const result = await openCadOptionsDialog(this.dialog, {data: {data: new CadData(), name, checkedItems}});
		if (result) {
			item.value = result.join("*");
		}
	}

	submit() {
		for (const item of this.data) {
			if (!item.value) {
				this.message.alert("请不要留空！");
				return;
			}
		}
		this.dialogRef.close(this.data);
	}

	close() {
		this.dialogRef.close();
	}
}

export function openCadLineTiaojianquzhiSelectDialog(dialog: MatDialog, config: MatDialogConfig<CadLineTjqzSelectData>) {
	return dialog.open<CadLineTjqzSelectComponent, CadLineTjqzSelectData, CadLineTjqzSelectData>(
		CadLineTjqzSelectComponent,
		config
	);
}
