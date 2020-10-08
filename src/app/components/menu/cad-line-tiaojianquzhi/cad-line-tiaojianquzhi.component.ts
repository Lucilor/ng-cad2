import {Component, Inject, Input, ViewChild} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity";
import {ColumnInfo, RowButtonEvent, TableComponent, TableErrorState, TableValidator} from "../../table/table.component";
import {MatTableDataSource} from "@angular/material/table";
import {cloneDeep} from "lodash";
import {openMessageDialog} from "../../message/message.component";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CommandAction} from "@src/app/store/actions";

type RawData = CadLine;
type RawDataLeft = RawData["tiaojianquzhi"][0];
type RawDataRight = RawDataLeft["data"][0];

@Component({
	selector: "app-cad-line-tiaojianquzhi",
	templateUrl: "./cad-line-tiaojianquzhi.component.html",
	styleUrls: ["./cad-line-tiaojianquzhi.component.scss"]
})
export class CadLineTiaojianquzhiComponent {
	dataLeft: MatTableDataSource<RawDataLeft>;
	columnsLeft: ColumnInfo[] = [
		{field: "key", name: "名字", type: "string", editable: true},
		{field: "level", name: "优先级", type: "number", editable: true},
		{field: "type", name: "类型", type: "select", options: ["选择", "数值"], editable: true},
		{field: "data", name: "数据", type: "button", buttons: [{name: "编辑", event: "edit"}]}
	];
	newItemLeft: RawDataLeft = {key: "", level: 1, type: "数值", data: []};
	validatorLeft: TableValidator<RawDataLeft> = (data) => {
		const result: TableErrorState = [];
		const duplicateLevels = [];
		const levels = [];
		const rows = [];
		data.data.forEach((v, row) => {
			if (levels.includes(v.level)) {
				duplicateLevels.push(v.level);
			} else {
				levels.push(v.level);
			}
		});
		data.data.forEach((v, row) => {
			if (duplicateLevels.includes(v.level)) {
				rows.push(row);
			}
		});
		if (rows.length) {
			result.push({rows, msg: "优先级重复"});
		}
		return result;
	};

	dataRight: MatTableDataSource<RawDataRight>;
	columnsRight: ColumnInfo[] = [
		{field: "name", name: "选项/范围", type: "string", editable: true},
		{field: "value", name: "取值", type: "number", editable: true},
		{field: "input", name: "可以输入修改", type: "boolean", editable: true}
	];
	newItemRight: RawDataRight;

	@ViewChild("tableLeft") tableLeft: TableComponent<RawDataLeft>;

	constructor(
		private dialog: MatDialog,
		public dialogRef: MatDialogRef<CadLineTiaojianquzhiComponent, RawData>,
		@Inject(MAT_DIALOG_DATA) public data: RawData,
		private store: Store<State>
	) {
		this.dataLeft = new MatTableDataSource(cloneDeep(data.tiaojianquzhi));
		this.dataRight = new MatTableDataSource([]);
	}

	submit() {
		if (this.tableLeft.errorState.length) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "当前数据存在错误"}});
		} else {
			this.data.tiaojianquzhi = this.dataLeft.data;
			this.store.dispatch<CommandAction>({type: "execute", command: {name: "save", args: []}});
		}
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
