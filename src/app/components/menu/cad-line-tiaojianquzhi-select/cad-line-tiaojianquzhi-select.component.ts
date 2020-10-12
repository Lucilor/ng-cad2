import {Component, Inject, OnInit} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {cloneDeep} from "lodash";
import {openMessageDialog} from "../../message/message.component";
import {openCadOptionsDialog} from "../cad-options/cad-options.component";

export type CadLineTiaojianquzhiSelectData = {key: string; value: string}[];

@Component({
	selector: "app-cad-line-tiaojianquzhi-select",
	templateUrl: "./cad-line-tiaojianquzhi-select.component.html",
	styleUrls: ["./cad-line-tiaojianquzhi-select.component.scss"]
})
export class CadLineTiaojianquzhiSelectComponent implements OnInit {
	constructor(
		public dialogRef: MatDialogRef<CadLineTiaojianquzhiSelectComponent, CadLineTiaojianquzhiSelectData>,
		@Inject(MAT_DIALOG_DATA) public data: CadLineTiaojianquzhiSelectData,
		private dialog: MatDialog
	) {
		this.data = cloneDeep(this.data);
	}

	ngOnInit() {}

	async onListClick(item: CadLineTiaojianquzhiSelectData[0]) {
		const name = item.key;
		const checkedItems = item.value.split("*");
		const ref = openCadOptionsDialog(this.dialog, {data: {data: new CadData(), name, checkedItems}});
		const result = await ref.afterClosed().toPromise();
		if (result) {
			item.value = result.join("*");
		}
	}

	submit() {
		for (const item of this.data) {
			if (!item.value) {
				openMessageDialog(this.dialog, {data: {type: "alert", content: "请不要留空！"}});
				return;
			}
		}
		this.dialogRef.close(this.data);
	}

	close() {
		this.dialogRef.close();
	}
}

export function openCadLineTiaojianquzhiSelectDialog(dialog: MatDialog, config: MatDialogConfig<CadLineTiaojianquzhiSelectData>) {
	return dialog.open<CadLineTiaojianquzhiSelectComponent, CadLineTiaojianquzhiSelectData, CadLineTiaojianquzhiSelectData>(
		CadLineTiaojianquzhiSelectComponent,
		config
	);
}
