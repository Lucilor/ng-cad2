import {SelectionModel} from "@angular/cdk/collections";
import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {MatSort} from "@angular/material/sort";
import {MatTableDataSource} from "@angular/material/table";
import {SatPopover} from "@ncstate/sat-popover";
import {downloadFile} from "@src/app/app.common";
import {cloneDeep, throttle} from "lodash";
import {openMessageDialog} from "../message/message.component";

export interface ColumnInfo {
	field: string;
	name: string;
	type: "string" | "number" | "boolean" | string[] | "button" | "none";
	buttons?: {name: string; event: string}[];
	width?: string;
}
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
	@Input() selectBoxSize = 40;
	@Output() rowButtonClick = new EventEmitter<RowButtonEvent<T>>();
	selection = new SelectionModel<T>(true, []);
	columnFields: string[];
	@ViewChild(MatSort) sort: MatSort;
	@ViewChild(SatPopover) editor: SatPopover;
	@ViewChild("input", {read: ElementRef}) input: ElementRef<HTMLInputElement>;

	editing: {colIdx: number; rowIdx: number; value: string};
	getColumnType(column: ColumnInfo) {
		const {type, buttons} = column;
		if (Array.isArray(type)) {
			return "array";
		} else if (type === "none") {
			return "string";
		} else if (Array.isArray(buttons) && type === "button") {
			return "button";
		} else {
			return type ?? "string";
		}
	}

	constructor(private dialog: MatDialog) {}

	ngOnInit() {
		this.columns = [{field: "select", name: "", type: "none", width: `${this.selectBoxSize}px`}, ...this.columns];
		this.columnFields = this.columns.map((v) => v.field);
		this.editing = {colIdx: -1, rowIdx: -1, value: ""};
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
	}

	removeItem(index?: number) {
		const {data: dataSource, selection} = this;
		if (typeof index === "number") {
			this.data.data.splice(index, 1);
			this.data._updateChangeSubscription();
		} else {
			dataSource.data = dataSource.data.filter((v) => !selection.isSelected(v));
			selection.clear();
		}
	}

	setEditing(colIdx: number, rowIdx: number) {
		const {field, type} = this.columns[colIdx + 1];
		let value = this.data.data[rowIdx][field];
		if (type === "boolean") {
			value = value === true ? "true" : "false";
		} else if (type === "none") {
			value = "";
		} else if (type === "number") {
			value = value.toString();
		}
		this.editing = {colIdx, rowIdx, value};
		this.editor.anchor = document.querySelector(`td[col='${colIdx}'][row='${rowIdx}']`) as HTMLElement;
		this.editor.open();
	}

	onEdit() {
		const {colIdx, rowIdx, value} = this.editing;
		const {field, type} = this.columns[colIdx + 1];
		if (type === "boolean") {
			this.data.data[rowIdx][field] = value === "true";
		} else if (type === "none") {
			this.data.data[rowIdx][field] = null;
		} else if (type === "number") {
			this.data.data[rowIdx][field] = Number(value);
		} else {
			this.data.data[rowIdx][field] = value;
		}
		this.editor.close();
	}

	// tslint:disable-next-line: member-ordering
	setCellValue = throttle((event: InputEvent | MatSelectChange | MatSlideToggleChange, colIdx: number, item: T) => {
		const {field, type} = this.columns[colIdx + 1];
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
}