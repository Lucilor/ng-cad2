import {SelectionModel} from "@angular/cdk/collections";
import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from "@angular/core";
import {MatSelectChange} from "@angular/material/select";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {MatSort} from "@angular/material/sort";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {downloadByString} from "@src/app/utils";
import {cloneDeep, debounce} from "lodash";

export interface ColumnInfoBase<T> {
    field: keyof T;
    name: string;
    width?: string;
    editable?: boolean;
}

export interface ColumnInfoNormal<T> extends ColumnInfoBase<T> {
    type: "string" | "number" | "boolean" | "checkbox";
}

export interface ColumnInfoSelect<T> extends ColumnInfoBase<T> {
    type: "select";
    options: string[];
}

export interface ColumnInfoButton<T> extends ColumnInfoBase<T> {
    type: "button";
    buttons: {name: string; event: string}[];
}

export type ColumnInfo<T> = ColumnInfoNormal<T> | ColumnInfoSelect<T> | ColumnInfoButton<T>;

export type TableErrorState = {rows: number[]; msg: string}[];

export type TableValidator<T> = (data: MatTableDataSource<T>) => TableErrorState;

export interface RowButtonEvent<T> {
    name: string;
    field: keyof T;
    item: T;
    colIdx: number;
    rowIdx: number;
}

export interface CellEvent<T> {
    field: keyof T;
    item: T;
    colIdx: number;
    rowIdx: number;
}

export interface RowEvent<T> {
    item: T;
    rowIdx: number;
}

export type ItemGetter<T> = (rowIdx: number) => T;

export type DataTransformer<T> = (type: "import" | "export", data: T[]) => any;

@Component({
    selector: "app-table",
    templateUrl: "./table.component.html",
    styleUrls: ["./table.component.scss"]
})
export class TableComponent<T> implements OnInit, AfterViewInit {
    @Input() data = new MatTableDataSource<T>();
    @Input() columns: ColumnInfo<T>[] = [];
    @Input() newItem?: T | ItemGetter<T>;
    @Input() title = "";
    @Input() checkBoxSize = 40;
    @Input() editable: string | boolean = true;
    @Input() validator?: TableValidator<T>;
    @Input() activeRows?: number[];
    @Input() dataTransformer?: DataTransformer<T>;

    @Output() rowButtonClick = new EventEmitter<RowButtonEvent<T>>();
    @Output() cellFocus = new EventEmitter<CellEvent<T>>();
    @Output() cellBlur = new EventEmitter<CellEvent<T>>();
    @Output() cellChange = new EventEmitter<CellEvent<T>>();
    @Output() rowClick = new EventEmitter<RowEvent<T>>();

    selection = new SelectionModel<T>(true, []);
    columnFields: (keyof T | "select")[] = [];
    @ViewChild(MatTable) table?: MatTable<T>;
    @ViewChild(MatSort) sort?: MatSort;
    @ViewChild("input", {read: ElementRef}) input?: ElementRef<HTMLInputElement>;
    errorState: TableErrorState = [];

    editing: {colIdx: number; rowIdx: number; value: string};

    constructor(private message: MessageService) {
        this.editing = {colIdx: -1, rowIdx: -1, value: ""};
    }

    ngOnInit() {
        this.columnFields = ["select", ...this.columns.map((v) => v.field)];
        this.validate();
    }

    ngAfterViewInit() {
        if (this.input) {
            this.input.nativeElement.onchange = this.onInputChange.bind(this);
        }
        this.data.sort = this.sort || null;
    }

    isAllSelected() {
        const {data: dataSource, selection} = this;
        const numSelected = selection.selected.length;
        const numRows = dataSource.data.length;
        return numSelected === numRows;
    }

    masterToggle() {
        const {data: dataSource, selection} = this;
        if (this.isAllSelected()) {
            selection.clear();
        } else {
            dataSource.data.forEach((row) => selection.select(row));
        }
    }

    addItem(rowIdx?: number) {
        const {newItem, data} = this;
        if (!newItem) {
            console.warn("no newItem to add");
            return;
        }
        if (typeof rowIdx !== "number") {
            rowIdx = data.data.length;
        }
        if (typeof newItem === "function") {
            const result = (newItem as ItemGetter<T>)(rowIdx);
            if (result) {
                data.data.splice(rowIdx, 0, cloneDeep(result));
            }
        } else {
            data.data.splice(rowIdx, 0, cloneDeep(newItem));
        }
        data._updateChangeSubscription();
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

    // eslint-disable-next-line @typescript-eslint/member-ordering
    setCellValue = debounce((event: Event | MatSelectChange | MatSlideToggleChange, colIdx: number, rowIdx: number, item: T) => {
        const {field, type} = this.columns[colIdx];
        if (event instanceof MatSelectChange) {
            item[field] = event.value;
        } else if (event instanceof MatSlideToggleChange) {
            item[field] = event.checked as any;
        } else {
            const value = (event.target as HTMLInputElement).value;
            if (type === "number") {
                item[field] = Number(value) as any;
            } else {
                item[field] = value as any;
            }
        }
        this.validate();
        this.cellChange.emit({field, item, colIdx, rowIdx});
    });

    onCellFocus(_event: FocusEvent, colIdx: number, rowIdx: number, item: T) {
        const {field} = this.columns[colIdx];
        this.cellFocus.emit({field, item, colIdx, rowIdx});
    }

    onCellBlur(_event: FocusEvent, colIdx: number, rowIdx: number, item: T) {
        const {field} = this.columns[colIdx];
        this.cellBlur.emit({field, item, colIdx, rowIdx});
    }

    onRowButtonClick(name: string, field: keyof T, item: T, colIdx: number, rowIdx: number) {
        this.rowButtonClick.emit({name, field, item, colIdx, rowIdx});
    }

    onRowClick(item: T, rowIdx: number) {
        this.rowClick.emit({item, rowIdx});
    }

    export() {
        let selected = this.selection.selected;
        if (selected.length < 1) {
            selected = this.data.data;
        }
        if (typeof this.dataTransformer === "function") {
            selected = this.dataTransformer("export", selected);
        }
        downloadByString(JSON.stringify(selected), (this.title ?? "table") + ".json");
    }

    import() {
        this.input?.nativeElement.click();
    }

    async onInputChange() {
        if (!this.input) {
            return;
        }
        const file = this.input.nativeElement.files?.[0];
        if (!file) {
            this.message.alert("没有选择文件");
            return;
        }
        const text = await file.text();
        let data: T[] | undefined;
        try {
            data = JSON.parse(text);
        } catch (error) {
            this.message.alert("读取文件失败");
        } finally {
            this.input.nativeElement.value = "";
        }
        if (Array.isArray(data)) {
            if (typeof this.dataTransformer === "function") {
                data = this.dataTransformer("import", data);
            }
            if (Array.isArray(data)) {
                data.forEach((v) => this.data.data.push(v));
                this.data._updateChangeSubscription();
                this.validate();
            } else {
                this.message.alert("数据格式错误");
            }
        } else {
            this.message.alert("数据格式错误");
        }
    }

    isColumnEditable(column: ColumnInfo<T>) {
        const {type, editable} = column;
        if (type === "button") {
            return true;
        }
        return (typeof this.editable === "string" || this.editable) && editable;
    }

    getColumnOptions(column: ColumnInfo<T>) {
        if (column.type === "select") {
            return column.options;
        }
        return [];
    }

    getColumnButtons(column: ColumnInfo<T>) {
        if (column.type === "button") {
            return column.buttons;
        }
        return [];
    }

    validate() {
        if (this.validator) {
            this.errorState = this.validator(this.data);
        } else {
            this.errorState = [];
        }
    }

    isVaild(row: number) {
        for (const v of this.errorState) {
            if (v.rows.includes(row)) {
                return false;
            }
        }
        return true;
    }

    toTypeString(str: any) {
        return str as string;
    }
}
