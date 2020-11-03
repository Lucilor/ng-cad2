import {Component, OnInit, ViewChild, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {MatTableDataSource} from "@angular/material/table";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entities";
import {CadConsoleService} from "@src/app/modules/cad-console/services/cad-console.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {cloneDeep} from "lodash";
import {ColumnInfo, TableComponent, TableValidator, TableErrorState, RowButtonEvent, CellEvent} from "../../table/table.component";
import {
	CadLineTjqzSelectData,
	openCadLineTiaojianquzhiSelectDialog
} from "../cad-line-tjqz-select/cad-line-tjqz-select.component";

type RawData = CadLine;
type RawDataLeft = RawData["tiaojianquzhi"][0];
type RawDataRight = RawDataLeft["data"][0];

@Component({
	selector: "app-cad-line-tjqz",
	templateUrl: "./cad-line-tjqz.component.html",
	styleUrls: ["./cad-line-tjqz.component.scss"]
})
export class CadLineTjqzComponent implements OnInit {
	dataLeft: MatTableDataSource<RawDataLeft>;
	columnsLeft: ColumnInfo<RawDataLeft>[] = [
		{field: "key", name: "名字", type: "string", editable: true},
		{field: "level", name: "优先级", type: "number", editable: true},
		{field: "type", name: "类型", type: "select", options: ["选择", "数值"], editable: true},
		{field: "data", name: "数据", type: "button", buttons: [{name: "编辑", event: "edit"}]}
	];
	newItemLeft: RawDataLeft = {key: "", level: 1, type: "数值", data: []};

	dataRight: MatTableDataSource<RawDataRight>;
	columnsRight: ColumnInfo<RawDataRight>[] = [
		{field: "name", name: "选项/范围", type: "string", editable: true},
		{field: "value", name: "取值", type: "number", editable: true},
		{field: "input", name: "可以输入修改", type: "boolean", editable: true}
	];
	newItemRight: RawDataRight = {name: "", value: 0, input: true};

	@ViewChild("tableLeft") tableLeft?: TableComponent<RawDataLeft>;
	loaderId = "cadLineTiaojianquzhiSavingCad";
	// openSelection: CadLineTiaojianquzhiSelectData = [];
	openSelection = -1;

	validatorLeft: TableValidator<RawDataLeft> = (data) => {
		const result: TableErrorState = [];
		const duplicateLevels: number[] = [];
		const levels: number[] = [];
		const rows: number[] = [];
		data.data.forEach((v) => {
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

	constructor(
		public dialogRef: MatDialogRef<CadLineTjqzComponent, RawData>,
		@Inject(MAT_DIALOG_DATA) public data: RawData,
		private dialog: MatDialog,
		private message: MessageService,
		private console: CadConsoleService,
		private status: AppStatusService
	) {
		this.dataLeft = new MatTableDataSource(cloneDeep(data.tiaojianquzhi));
		this.dataRight = new MatTableDataSource<RawDataRight>([]);
	}

	ngOnInit() {}

	submit() {
		if (this.tableLeft?.errorState.length) {
			this.message.alert("当前数据存在错误");
		} else {
			this.data.tiaojianquzhi = this.dataLeft.data;
			this.status.loaderId$.next(this.loaderId);
			this.console.execute("save");
		}
	}

	async close() {
		const str1 = JSON.stringify(this.data.tiaojianquzhi);
		const str2 = JSON.stringify(this.dataLeft.data);
		if (str1 !== str2) {
			const yes = await this.message.confirm("是否放弃所作修改?");
			if (!yes) {
				return;
			}
		}
		this.dialogRef.close();
	}

	setOpenSelection(item: RawDataLeft, rowIdx: number) {
		const {type} = item;
		this.openSelection = type === "选择" ? rowIdx : -1;
	}

	onRowButtonClick(event: RowButtonEvent<RawDataLeft>) {
		const {name, item, rowIdx} = event;
		if (name === "edit") {
			this.dataRight.data = item.data;
			this.setOpenSelection(item, rowIdx);
		}
	}

	onCellChange(event: CellEvent<RawDataLeft>) {
		this.setOpenSelection(event.item, event.rowIdx);
	}

	async onCellFocus(event: CellEvent<RawDataRight>) {
		if (event.field === "name" && this.openSelection > -1) {
			const keys = this.dataLeft.data[this.openSelection].key.split(/,|，/).filter((v) => v);
			const values = event.item.name.split(/,|，/);
			const data: CadLineTjqzSelectData = keys.map((v, i) => {
				return {key: v, value: values[i] ?? ""};
			});
			if (data.length) {
				const ref = openCadLineTiaojianquzhiSelectDialog(this.dialog, {data});
				const result = await ref.afterClosed().toPromise();
				if (result) {
					this.dataRight.data[event.rowIdx].name = result.map((v) => v.value).join(",");
				}
			}
		}
	}
}

export function openCadLineTiaojianquzhiDialog(dialog: MatDialog, config: MatDialogConfig<RawData>) {
	return dialog.open<CadLineTjqzComponent, RawData, RawData>(CadLineTjqzComponent, config);
}