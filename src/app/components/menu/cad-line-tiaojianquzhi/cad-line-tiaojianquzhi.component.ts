import {Component, Inject, Injector, OnInit, ViewChild} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity";
import {CellEvent, ColumnInfo, RowButtonEvent, TableComponent, TableErrorState, TableValidator} from "../../table/table.component";
import {MatTableDataSource} from "@angular/material/table";
import {cloneDeep} from "lodash";
import {openMessageDialog} from "../../message/message.component";
import {CommandAction} from "@src/app/store/actions";
import {MenuComponent} from "../menu.component";
import {
	CadLineTiaojianquzhiSelectData,
	openCadLineTiaojianquzhiSelectDialog
} from "../cad-line-tiaojianquzhi-select/cad-line-tiaojianquzhi-select.component";

type RawData = CadLine;
type RawDataLeft = RawData["tiaojianquzhi"][0];
type RawDataRight = RawDataLeft["data"][0];

@Component({
	selector: "app-cad-line-tiaojianquzhi",
	templateUrl: "./cad-line-tiaojianquzhi.component.html",
	styleUrls: ["./cad-line-tiaojianquzhi.component.scss"]
})
export class CadLineTiaojianquzhiComponent extends MenuComponent implements OnInit {
	dataLeft: MatTableDataSource<RawDataLeft>;
	columnsLeft: ColumnInfo[] = [
		{field: "key", name: "名字", type: "string", editable: true},
		{field: "level", name: "优先级", type: "number", editable: true},
		{field: "type", name: "类型", type: "select", options: ["选择", "数值"], editable: true},
		{field: "data", name: "数据", type: "button", buttons: [{name: "编辑", event: "edit"}]}
	];
	newItemLeft: RawDataLeft = {key: "", level: 1, type: "数值", data: []};

	dataRight: MatTableDataSource<RawDataRight>;
	columnsRight: ColumnInfo[] = [
		{field: "name", name: "选项/范围", type: "string", editable: true},
		{field: "value", name: "取值", type: "number", editable: true},
		{field: "input", name: "可以输入修改", type: "boolean", editable: true}
	];
	newItemRight: RawDataRight;

	@ViewChild("tableLeft") tableLeft: TableComponent<RawDataLeft>;
	loaderId = "cadLineTiaojianquzhiSavingCad";
	// openSelection: CadLineTiaojianquzhiSelectData = [];
	openSelection = -1;

	validatorLeft: TableValidator<RawDataLeft> = (data) => {
		const result: TableErrorState = [];
		const duplicateLevels = [];
		const levels = [];
		const rows = [];
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
		injector: Injector,
		public dialogRef: MatDialogRef<CadLineTiaojianquzhiComponent, RawData>,
		@Inject(MAT_DIALOG_DATA) public data: RawData
	) {
		super(injector);
		this.dataLeft = new MatTableDataSource(cloneDeep(data.tiaojianquzhi));
		this.dataRight = new MatTableDataSource([]);
	}

	ngOnInit() {}

	submit() {
		if (this.tableLeft.errorState.length) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "当前数据存在错误"}});
		} else {
			this.data.tiaojianquzhi = this.dataLeft.data;
			this.store.dispatch<CommandAction>({
				type: "execute",
				command: {name: "save", args: [{name: "loaderId", value: this.loaderId}]}
			});
		}
	}

	async close() {
		const str1 = JSON.stringify(this.data.tiaojianquzhi);
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

	setOpenSelection(item: RawDataLeft, rowIdx: number) {
		const {type} = item;
		this.openSelection = type === "选择" ? rowIdx : -1;
	}

	onRowButtonClick(event: RowButtonEvent<RawDataLeft>) {
		const {name, item, rowIdx} = event;
		if (name === "edit") {
			this.dataRight.data = item.data;
			this.newItemRight = {name: "", value: 0, input: true};
			this.setOpenSelection(item, rowIdx);
		}
	}

	onCellChange(event: CellEvent<RawDataLeft>) {
		this.setOpenSelection(event.item, event.rowIdx);
	}

	async onCellFocus(event: CellEvent<RawDataRight>) {
		if (event.field === "name" && this.openSelection > -1) {
			const keys = this.dataLeft.data[this.openSelection].key.split(/,|，/);
			const values = event.item.name.split(/,|，/);
			const data: CadLineTiaojianquzhiSelectData = keys.map((v, i) => {
				return {key: v, value: values[i] ?? ""};
			});
			const ref = openCadLineTiaojianquzhiSelectDialog(this.dialog, {data});
			const result = await ref.afterClosed().toPromise();
			if (result) {
				this.dataRight.data[event.rowIdx].name = result.map((v) => v.value).join(",");
			}
		}
	}
}

export function openCadLineTiaojianquzhiDialog(dialog: MatDialog, config: MatDialogConfig<RawData>) {
	return dialog.open<CadLineTiaojianquzhiComponent, RawData, RawData>(CadLineTiaojianquzhiComponent, config);
}
