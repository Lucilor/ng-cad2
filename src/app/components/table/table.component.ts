import {SelectionModel} from "@angular/cdk/collections";
import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {MatSort} from "@angular/material/sort";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {SatPopover} from "@ncstate/sat-popover";
import {downloadFile} from "@src/app/app.common";
import {cloneDeep, throttle} from "lodash";
import {openMessageDialog} from "../message/message.component";

export interface ColumnInfoBase {
	field: string;
	name: string;
	width?: string;
	editable?: boolean;
}

export interface ColumnInfoNormal extends ColumnInfoBase {
	type: "string" | "number" | "boolean" | "checkbox";
}

export interface ColumnInfoSelect extends ColumnInfoBase {
	type: "select";
	options: string[];
}

export interface ColumnInfoButton extends ColumnInfoBase {
	type: "button";
	buttons: {name: string; event: string}[];
}

export type ColumnInfo = ColumnInfoNormal | ColumnInfoSelect | ColumnInfoButton;

export type TableErrorState = {rows: number[]; msg: string}[];

export type TableValidator<T> = (data: MatTableDataSource<T>) => TableErrorState;

export interface RowButtonEvent<T> {
	name: string;
	field: string;
	item: T;
}

@Component({
	selector: "app-table",
	templateUrl: "./table.component.html",
	styleUrls: ["./table.component.scss"]
})
export class TableComponent<T> implements OnInit, AfterViewInit {
	@Input() data: MatTableDataSource<T>;
	@Input() columns: ColumnInfo[];
	@Input() newItem: T;
	@Input() title: string;
	@Input() checkBoxSize = 40;
	@Input() editable: string | boolean;
	@Input() validator: TableValidator<T>;
	@Output() rowButtonClick = new EventEmitter<RowButtonEvent<T>>();
	selection = new SelectionModel<T>(true, []);
	columnFields: string[];
	@ViewChild(MatTable) table: MatTable<T>;
	@ViewChild(MatSort) sort: MatSort;
	@ViewChild("input", {read: ElementRef}) input: ElementRef<HTMLInputElement>;
	errorState: TableErrorState;

	editing: {colIdx: number; rowIdx: number; value: string};

	constructor(private dialog: MatDialog) {}

	ngOnInit() {
		this.columnFields = ["select", ...this.columns.map((v) => v.field)];
		this.editing = {colIdx: -1, rowIdx: -1, value: ""};
		this.validate();
	}

	ngAfterViewInit() {
		this.data.sort = this.sort;
		this.input.nativeElement.onchange = this.onInputChange.bind(this);
	}

	isAllSelected() {
		const {data: dataSource, selection} = this;
		const numSelected = selection.selected.length;
		const numRows = dataSource.data.length;
		return numSelected === numRows;
	}

	masterToggle() {
		const {data: dataSource, selection} = this;
		this.isAllSelected() ? selection.clear() : dataSource.data.forEach((row) => selection.select(row));
	}

	addItem(index?: number) {
		if (typeof index !== "number") {
			index = Infinity;
		}
		const {data: dataSource, newItem} = this;
		dataSource.data.splice(index, 0, cloneDeep(newItem));
		dataSource._updateChangeSubscription();
		this.validate();
	}

	removeItem(index?: number) {
		const {data: dataSource, selection} = this;
		if (typeof index === "number") {
			this.data.data.splice(index, 1);
			this.data._updateChangeSubscription();
		} else {
			const toRemove: number[] = [];
			dataSource.data.forEach((v, i) => {
				if (selection.isSelected(v)) {
					toRemove.unshift(i);
				}
			});
			toRemove.forEach((v) => dataSource.data.splice(v, 1));
			this.data._updateChangeSubscription();
			selection.clear();
		}
		this.validate();
	}

	// tslint:disable-next-line: member-ordering
	setCellValue = throttle((event: InputEvent | MatSelectChange | MatSlideToggleChange, colIdx: number, item: T) => {
		const {field, type} = this.columns[colIdx];
		if (event instanceof MatSelectChange) {
			item[field] = event.value;
		} else if (event instanceof MatSlideToggleChange) {
			item[field] = event.checked;
		} else {
			const value = (event.target as HTMLInputElement).value;
			if (type === "number") {
				item[field] = Number(value);
			} else {
				item[field] = value;
			}
		}
		this.validate();
	});

	onRowButtonClick(name: string, field: string, item: T) {
		this.rowButtonClick.emit({name, field, item});
	}

	export() {
		downloadFile(JSON.stringify(this.data.data), (this.title ?? "table") + ".json");
	}

	import() {
		this.input.nativeElement.click();
	}

	async onInputChange() {
		const file = this.input.nativeElement.files[0];
		if (!file) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "没有选择文件"}});
			return;
		}
		const text = await file.text();
		try {
			this.data.data = JSON.parse(text);
		} catch (error) {
			openMessageDialog(this.dialog, {data: {type: "alert", content: "读取文件失败"}});
		} finally {
			this.input.nativeElement.value = "";
		}
	}

	isColumnEditable(column: ColumnInfo) {
		const {type, editable} = column;
		if (type === "button") {
			return true;
		}
		return (typeof this.editable === "string" || this.editable) && editable;
	}

	getColumnOptions(column: ColumnInfoSelect) {
		return column.options;
	}

	getColumnButtons(column: ColumnInfoButton) {
		return column.buttons;
	}

	validate() {
		if (this.validator) {
			this.errorState = this.validator(this.data);
		} else {
			this.errorState = [];
		}
		console.log(this.errorState);
	}

	isVaild(row: number) {
		for (const v of this.errorState) {
			if (v.rows.includes(row)) {
				return false;
			}
		}
		return true;
	}
}
