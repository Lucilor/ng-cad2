import {MatTableDataSource} from "@angular/material/table";
import {ObjectOf} from "@lucilor/utils";
import {InputInfoOptions} from "@modules/input/components/input.types";
import csstype from "csstype";

export interface TableRenderInfo<T> {
  data: T[];
  columns: ColumnInfo<T>[];
  newItem?: T | ItemGetter<T>;
  title?: string;
  noCheckBox?: boolean;
  checkBoxSize?: number;
  editMode?: boolean;
  sortable?: boolean;
  validator?: TableValidator<T>;
  activeRows?: number[];
  dataTransformer?: DataTransformer<T>;
  toolbarButtons?: {
    add?: boolean;
    remove?: boolean;
    import?: boolean;
    export?: boolean;
    editModeToggle?: boolean;
    extra?: TableButton[];
  };
  isTree?: boolean;
  onlineMode?: {tableName: string; refresh: () => Promise<void>};
}

export interface TableButton {
  event: string;
  title?: string;
  color?: string;
  class?: string | string[];
  style?: csstype.Properties;
}

export interface ColumnInfoBase<T> {
  field: keyof T;
  name: string;
  width?: string;
  editable?: boolean;
  required?: boolean;
  sticky?: boolean;
  hidden?: boolean;
}

export interface ColumnInfoNormal<T> extends ColumnInfoBase<T> {
  type: "string" | "number" | "boolean" | "checkbox";
}

export interface ColumnInfoTime<T> extends ColumnInfoBase<T> {
  type: "time";
}

export interface ColumnInfoSelect<T> extends ColumnInfoBase<T> {
  type: "select";
  options: InputInfoOptions;
}

export interface ColumnInfoButton<T> extends ColumnInfoBase<T> {
  type: "button";
  buttons: TableButton[];
}

export interface ColumnInfoLink<T> extends ColumnInfoBase<T> {
  type: "link";
  links: ObjectOf<string>;
  linkedTable: string;
  multiSelect?: boolean;
}

export interface ColumnInfoImage<T> extends ColumnInfoBase<T> {
  type: "image";
  hasSmallImage?: boolean;
}

export interface ColumnInfoFile<T> extends ColumnInfoBase<T> {
  type: "file";
  mime?: string;
}

export interface ColumnInfoCad<T> extends ColumnInfoBase<T> {
  type: "cad";
  filterFn?: (event: CellEvent<T>) => boolean;
}

export type ColumnInfo<T> =
  | ColumnInfoTime<T>
  | ColumnInfoNormal<T>
  | ColumnInfoSelect<T>
  | ColumnInfoButton<T>
  | ColumnInfoLink<T>
  | ColumnInfoImage<T>
  | ColumnInfoFile<T>
  | ColumnInfoCad<T>;

export type TableErrorState = {rows: number[]; msg: string}[];

export type TableValidator<T> = (data: MatTableDataSource<T>) => TableErrorState;

export interface RowButtonEvent<T> {
  button: TableButton;
  column: ColumnInfo<T>;
  item: T;
  colIdx: number;
  rowIdx: number;
}

export interface CellEvent<T> {
  column: ColumnInfo<T>;
  item: T;
  colIdx: number;
  rowIdx: number;
}

export type ItemGetter<T> = ((rowIdx: number) => T) | ((rowIdx: number) => Promise<T>);

export type DataTransformer<T> = (type: "import" | "export", data: T[]) => any;
