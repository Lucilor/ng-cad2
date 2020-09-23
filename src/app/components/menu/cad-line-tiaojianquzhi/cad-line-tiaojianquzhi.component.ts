import {Component, Inject} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity";
import {ColumnInfo, RowButtonEvent} from "../../table/table.component";
import {MatTableDataSource} from "@angular/material/table";
import {cloneDeep} from "lodash";
import {openMessageDialog} from "../../message/message.component";

type RawData = CadLine["tiaojianquzhi"];
type RawDataLeft = RawData[0];
type RawDataRight = RawDataLeft["data"][0];

@Component({
	selector: "app-cad-line-tiaojianquzhi",
	templateUrl: "./cad-line-tiaojianquzhi.component.html",
	styleUrls: ["./cad-line-tiaojianquzhi.component.scss"]
})
export class CadLineTiaojianquzhiComponent {
	dataLeft: MatTableDataSource<RawDataLeft>;
	columnsLeft: ColumnInfo[] = [
		{field: "key", name: "名字", type: "string"},
		{field: "level", name: "优先级", type: "number"},
		{field: "type", name: "类型", type: ["选项", "数值"]},
		{field: "data", name: "数据", type: "button", buttons: [{name: "编辑", event: "edit"}]}
	];
	newItemLeft: RawDataLeft = {key: "", level: 1, type: "数值", data: []};

	dataRight: MatTableDataSource<RawDataRight>;
	columnsRight: ColumnInfo[] = [
		{field: "name", name: "选项/范围", type: "string"},
		{field: "value", name: "取值", type: "number"},
		{field: "input", name: "可以输入修改", type: "boolean"}
	];
	newItemRight: RawDataRight;

	constructor(
		private dialog: MatDialog,
		public dialogRef: MatDialogRef<CadLineTiaojianquzhiComponent, RawData>,
		@Inject(MAT_DIALOG_DATA) public data: RawData
	) {
		this.dataLeft = new MatTableDataSource(cloneDeep(data));
		this.dataRight = new MatTableDataSource([]);
	}

	submit() {
		this.dialogRef.close(this.dataLeft.data);
	}

	async close() {
		const str1 = JSON.stringify(this.data);
		const str2 = JSON.stringify(this.dataLeft.data);
		if (str1 !== str2) {
			const ref = openMessageDialog(this.dialog, {data: {type: "confirm", content: "是否放弃所作修改?"}});
			const yes = await ref.afterClosed().toPromise();
			if (!yes) {
				return;
			}
		}
		this.dialogRef.close();
	}

	onRowButtonClick(event: RowButtonEvent<RawDataLeft>) {
		const {name, item} = event;
		if (name === "edit") {
			this.dataRight.data = item.data;
			this.newItemRight = {name: "", value: 0, input: true};
		}
	}
}

export function openCadLineTiaojianquzhiDialog(dialog: MatDialog, config: MatDialogConfig<RawData>) {
	return dialog.open<CadLineTiaojianquzhiComponent, RawData, RawData>(CadLineTiaojianquzhiComponent, config);
}
