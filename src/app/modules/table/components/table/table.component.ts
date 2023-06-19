import {SelectionModel} from "@angular/cdk/collections";
import {FlatTreeControl} from "@angular/cdk/tree";
import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  Input,
  KeyValueChanges,
  KeyValueDiffer,
  KeyValueDiffers,
  Output,
  ViewChild
} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {MatSort} from "@angular/material/sort";
import {MatTable, MatTableDataSource} from "@angular/material/table";
import {MatTreeFlatDataSource, MatTreeFlattener} from "@angular/material/tree";
import {getFilepathUrl, joinOptions, splitOptions} from "@app/app.common";
import {getCadPreview} from "@app/cad/cad-preview";
import {openCadEditorDialog} from "@components/dialogs/cad-editor-dialog/cad-editor-dialog.component";
import {CadOptionsInput, openCadOptionsDialog} from "@components/dialogs/cad-options/cad-options.component";
import {CadData} from "@lucilor/cad-viewer";
import {dataURLtoBlob, downloadByString, ObjectOf, selectFiles} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService, OpenCadOptions} from "@services/app-status.service";
import csstype from "csstype";
import {cloneDeep, intersection, isEqual} from "lodash";
import md5 from "md5";
import {BehaviorSubject, filter, lastValueFrom, take} from "rxjs";
import {CellEvent, ColumnInfo, ItemGetter, RowButtonEvent, TableButton, TableErrorState, TableRenderInfo} from "./table.types";
import {getInputInfosFromTableColumns} from "./table.utils";

@Component({
  selector: "app-table",
  templateUrl: "./table.component.html",
  styleUrls: ["./table.component.scss"]
})
export class TableComponent<T> implements AfterViewInit, DoCheck {
  @Input() info: TableRenderInfo<T> = {data: [], columns: []};

  @Output() rowButtonClick = new EventEmitter<RowButtonEvent<T>>();
  @Output() cellFocus = new EventEmitter<CellEvent<T>>();
  @Output() cellBlur = new EventEmitter<CellEvent<T>>();
  @Output() cellChange = new EventEmitter<CellEvent<T>>();
  @Output() cellClick = new EventEmitter<CellEvent<T>>();
  @Output() toolbarButtonClick = new EventEmitter<TableButton>();

  selection = new SelectionModel<T>(true, []);
  columnFields: (keyof T | "select")[] = [];
  @ViewChild(MatTable) table?: MatTable<T>;
  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild("input", {read: ElementRef}) input?: ElementRef<HTMLInputElement>;
  errorState: TableErrorState = [];
  private infoDiffer: KeyValueDiffer<string, any>;
  treeControl = new FlatTreeControl<any>(
    (node) => node.level,
    (node) => node.expandable
  );
  treeFlattener = new MatTreeFlattener(
    (node: any, level: number) => {
      node.expandable = !!node.children && node.children.length > 0;
      node.level = level;
      return node;
    },
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children
  );
  cadImgs: ObjectOf<string> = {};
  private _isGeneratingCadImg$ = new BehaviorSubject(false);

  dataSource: MatTreeFlatDataSource<any, any> | MatTableDataSource<T> = new MatTableDataSource();

  editing: {colIdx: number; rowIdx: number; value: string};

  get toolbarButtons() {
    return this.info.toolbarButtons || {};
  }

  constructor(
    private message: MessageService,
    private differs: KeyValueDiffers,
    private dialog: MatDialog,
    private dataService: CadDataService,
    private status: AppStatusService
  ) {
    this.editing = {colIdx: -1, rowIdx: -1, value: ""};
    this.infoDiffer = this.differs.find(this.info).create();
  }

  ngAfterViewInit() {
    if (this.input) {
      this.input.nativeElement.onchange = this.onInputChange.bind(this);
    }
    if (this.dataSource instanceof MatTableDataSource) {
      this.dataSource.sort = this.sort || null;
    }
  }

  ngDoCheck() {
    const changes = this.infoDiffer.diff(this.info);
    if (changes) {
      this.infoChanged(changes);
    }
  }

  infoChanged(changes: KeyValueChanges<string, any>) {
    const changedKeys: string[] = [];
    changes.forEachChangedItem((v) => {
      changedKeys.push(v.key);
    });
    changes.forEachAddedItem((v) => {
      changedKeys.push(v.key);
    });
    changes.forEachRemovedItem((v) => {
      changedKeys.push(v.key);
    });
    {
      const keys: (keyof TableRenderInfo<T>)[] = ["columns", "noCheckBox"];
      if (intersection(changedKeys, keys).length > 0) {
        this.columnFields = [...this.info.columns.map((v) => v.field)];
        if (!this.info.noCheckBox) {
          this.columnFields.unshift("select");
        }
      }
    }
    {
      const keys: (keyof TableRenderInfo<T>)[] = ["data", "validator", "isTree"];
      if (intersection(changedKeys, keys).length > 0) {
        this.cadImgs = {};
        const data = this.info.data;
        if (this.info.isTree) {
          this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener, data);
        } else {
          this.dataSource = new MatTableDataSource(data);
        }
        this.validate();
      }
    }
  }

  isAllSelected() {
    const {selection} = this;
    const numSelected = selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    const {info, selection} = this;
    if (this.isAllSelected()) {
      selection.clear();
    } else {
      info.data.forEach((row) => selection.select(row));
    }
  }

  async addItem(rowIdx?: number) {
    const {onlineMode, isTree, newItem, data} = this.info;
    if (onlineMode) {
      const infos = getInputInfosFromTableColumns(this.info.columns.filter((v) => v.required));
      const values = await this.message.form(infos);
      if (values) {
        const {tableName, refresh} = onlineMode;
        const insertResult = await this.dataService.tableInsert({table: tableName, data: values});
        if (insertResult) {
          await refresh();
        }
      }
    } else {
      if (isTree) {
        this.message.error("树形表格不支持添加");
      }
      if (!newItem) {
        console.warn("no newItem to add");
        return;
      }
      if (typeof rowIdx !== "number") {
        rowIdx = data.length;
      }
      if (typeof newItem === "function") {
        let result = (newItem as ItemGetter<T>)(rowIdx);
        if (result instanceof Promise) {
          result = await result;
        }
        if (result) {
          data.splice(rowIdx, 0, cloneDeep(result));
        }
      } else {
        data.splice(rowIdx, 0, cloneDeep(newItem));
      }
      this.dataSource.data = data;
    }
  }

  async removeItem(index?: number) {
    const {info, selection} = this;
    const {onlineMode, isTree, data} = info;
    if (onlineMode) {
      const vids = selection.selected.map((v) => Number((v as any).vid));
      if (vids.length < 1) {
        this.message.error("未选中任何数据");
        return;
      } else if (await this.message.confirm(`确定删除选中的${vids.length}条数据？`)) {
        const {tableName, refresh} = onlineMode;
        const deleteResult = await this.dataService.tableDelete({table: tableName, vids});
        if (deleteResult) {
          await refresh();
        }
      }
    } else {
      if (isTree) {
        this.message.error("树形表格不支持删除");
      }
      if (typeof index === "number") {
        data.splice(index, 1);
      } else {
        const toRemove: number[] = [];
        data.forEach((v, i) => {
          if (selection.isSelected(v)) {
            toRemove.unshift(i);
          }
        });
        toRemove.forEach((v) => data.splice(v, 1));
        selection.clear();
      }
      this.dataSource.data = data;
    }
  }

  setCellValue(event: any, colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    const {field, type} = column;
    const {onlineMode} = this.info;
    const valueBefore = item[field];
    if (event instanceof MatSelectChange) {
      item[field] = event.value;
    } else if (event instanceof MatSlideToggleChange) {
      item[field] = event.checked as any;
      if (onlineMode) {
        item[field] = (event.checked ? 1 : 0) as any;
      } else {
        item[field] = event.checked as any;
      }
    } else if (event instanceof Event) {
      const value = (event.target as HTMLInputElement).value;
      if (type === "number") {
        item[field] = Number(value) as any;
      } else {
        item[field] = value as any;
      }
    } else {
      item[field] = event;
    }
    const valueAfter = item[field];
    if (!isEqual(valueBefore, valueAfter)) {
      this.validate();
      const item2 = item as TableDataBase;
      if (onlineMode && this.errorState.length < 1) {
        this.dataService.tableUpdate({table: onlineMode.tableName, data: {vid: item2.vid, [field]: valueAfter}});
      }
      this.cellChange.emit({column, item, colIdx, rowIdx});
    }
    this.cellChange.emit({column, item, colIdx, rowIdx});
  }

  onCellFocus(_event: FocusEvent, colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    this.cellFocus.emit({column, item, colIdx, rowIdx});
  }

  onCellBlur(_event: FocusEvent, colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    this.cellBlur.emit({column, item, colIdx, rowIdx});
  }

  async onCellClick(event: CellEvent<T>) {
    this.cellClick.emit(event);
  }

  onRowButtonClick(event: RowButtonEvent<T>) {
    this.rowButtonClick.emit(event);
  }

  export() {
    let selected = this.selection.selected;
    if (selected.length < 1) {
      selected = this.info.data;
    }
    if (typeof this.info.dataTransformer === "function") {
      selected = this.info.dataTransformer("export", selected);
    }
    downloadByString(JSON.stringify(selected), {filename: (this.info.title ?? "table") + ".json"});
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
      if (typeof this.info.dataTransformer === "function") {
        data = this.info.dataTransformer("import", data);
      }
      if (Array.isArray(data)) {
        data.forEach((v) => this.info.data.push(v));
        this.validate();
      } else {
        this.message.alert("数据格式错误");
      }
    } else {
      this.message.alert("数据格式错误");
    }
  }

  isColumnEditable(event: CellEvent<T>, forgetEditMode = false) {
    const {type, editable} = event.column;
    if (type === "button") {
      return true;
    }
    if (type === "cad" && !this.getIsTypeCadEnabled(event)) {
      return false;
    }
    return !!((forgetEditMode || this.info.editMode) && editable);
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

  getColumnLinkedValue(column: ColumnInfo<T>, item: T) {
    const {type, field} = column;
    if (type === "link") {
      const vals = splitOptions(item[field] as string);
      return joinOptions(vals.map((v) => column.links[v]));
    }
    return item[field] as string;
  }

  validate() {
    if (this.info.validator && this.dataSource instanceof MatTableDataSource) {
      this.errorState = this.info.validator(this.dataSource);
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

  getCheckBoxStyle() {
    const style: csstype.Properties = {};
    const checkBoxSize = this.info.checkBoxSize ?? 50;
    style.flex = `0 0 ${checkBoxSize}px`;
    return style;
  }

  getCellClass(column: ColumnInfo<T>) {
    const classes: string[] = ["column-type-" + column.type];
    return classes;
  }

  getCellStyle(column: ColumnInfo<T>) {
    const style: csstype.Properties = {};
    if (column.width) {
      style.flex = `0 0 ${column.width}`;
    }
    return style;
  }

  getItemImgSmall(item: T, column: ColumnInfo<T>) {
    const {type} = column;
    if (type === "image") {
      const {hasSmallImage} = column;
      const value = item[column.field] as string;
      if (hasSmallImage) {
        return getFilepathUrl(value, {prefix: "s_"});
      } else {
        return getFilepathUrl(value);
      }
    } else {
      return "";
    }
  }

  getItemImgLarge(item: T, column: ColumnInfo<T>) {
    const {type} = column;
    if (type === "image") {
      const value = item[column.field] as string;
      return getFilepathUrl(value);
    } else {
      return "";
    }
  }

  getItemCadImgId(item: T, column: ColumnInfo<T>) {
    const value = item[column.field];
    let id: string;
    if (typeof value === "string") {
      id = md5(value);
    } else if (value instanceof CadData) {
      id = value.id;
    } else {
      return "";
    }
    this.generateItemCadImg(id, item, column);
    return id;
  }

  async uploadFile(colIdx: number, rowIdx: number, item: T) {
    const {onlineMode} = this.info;
    if (!onlineMode) {
      return;
    }
    const column = this.info.columns[colIdx];
    const vid = Number((item as any).vid);
    const field = column.field as any;
    let accept: string | undefined;
    switch (column.type) {
      case "image":
        accept = "image/*";
        break;
      case "file":
        accept = column.mime;
        break;
      default:
        return;
    }
    const file = (await selectFiles({accept}))?.[0];
    if (!file) {
      return;
    }
    await this.dataService.tableUploadFile({table: onlineMode.tableName, vid, field, file});
  }

  async deleteFile(colIdx: number, rowIdx: number, item: T) {
    const {onlineMode} = this.info;
    if (!onlineMode) {
      return;
    }
    const column = this.info.columns[colIdx];
    const vid = Number((item as any).vid);
    const field = column.field as any;
    await this.dataService.tableDeleteFile({table: onlineMode.tableName, vid, field});
  }

  async generateItemCadImg(id: string, item: T, column: ColumnInfo<T>) {
    if (id in this.cadImgs) {
      return;
    }
    this.cadImgs[id] = "";
    if (this._isGeneratingCadImg$) {
      await lastValueFrom(
        this._isGeneratingCadImg$.pipe(
          filter((v) => !v),
          take(1)
        )
      );
    }
    let value = item[column.field];
    try {
      value = JSON.parse(value as any);
    } catch (error) {}
    if (value) {
      this._isGeneratingCadImg$.next(true);
      const data = new CadData(value);
      const dataURL = await getCadPreview("cad", data);
      const src = URL.createObjectURL(dataURLtoBlob(dataURL));
      this.cadImgs[id] = src;
      this._isGeneratingCadImg$.next(false);
    }
  }

  onToolbarBtnClick(button: TableButton) {
    this.toolbarButtonClick.emit(button);
  }

  toggleEditMode() {
    this.info.editMode = !this.info.editMode;
  }

  async selectOptions(colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    const {type, field} = column;
    if (type !== "link") {
      return;
    }
    const {linkedTable, multiSelect} = column;
    const checkedVids = splitOptions(item[field] as string).map((v) => Number(v));
    const data: CadOptionsInput = {name: linkedTable, checkedVids, multi: multiSelect};
    const result = await openCadOptionsDialog(this.dialog, {data});
    if (result) {
      const value = joinOptions(result.map((v) => String(v.vid)));
      this.setCellValue(value, colIdx, rowIdx, item);
    }
  }

  async openCad(colIdx: number, rowIdx: number, item: T) {
    const column = this.info.columns[colIdx];
    if (column.type === "cad" && this.isColumnEditable({column, item, colIdx, rowIdx}, true)) {
      let cadData: CadData | undefined;
      try {
        cadData = new CadData(JSON.parse(item[column.field] as string));
      } catch (error) {}
      if (cadData) {
        const data: OpenCadOptions = {data: cadData, isLocal: true, center: true};
        const result = await openCadEditorDialog(this.dialog, {data});
        if (result?.isSaved) {
          const cadData2 = this.status.closeCad();
          this.setCellValue(JSON.stringify(cadData2.export()), colIdx, rowIdx, item);
        }
      }
    }
  }

  async uploadCad(colIdx: number, rowIdx: number, item: T) {
    const file = (await selectFiles({accept: ".dxf"}))?.[0];
    if (!file) {
      return;
    }
    const data = await this.dataService.uploadDxf(file);
    if (data) {
      this.setCellValue(JSON.stringify(data.export()), colIdx, rowIdx, item);
    }
  }

  async deleteCad(colIdx: number, rowIdx: number, item: T) {
    this.setCellValue("", colIdx, rowIdx, item);
  }

  getIsTypeCadEnabled(event: CellEvent<T>) {
    const {type} = event.column;
    if (type !== "cad") {
      return false;
    }
    const {filterFn} = event.column;
    if (filterFn) {
      return filterFn(event);
    }
    return true;
  }
}
