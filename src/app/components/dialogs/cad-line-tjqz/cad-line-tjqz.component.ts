import {Component, Inject, ViewChild} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadLine} from "@cad-viewer";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {MessageService} from "@modules/message/services/message.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {CellEvent, ItemGetter, TableErrorState, TableRenderInfo} from "@modules/table/components/table/table.types";
import {cloneDeep} from "lodash";
import {CadLineTjqzSelectData, openCadLineTjqzSelectDialog} from "../cad-line-tjqz-select/cad-line-tjqz-select.component";
import {getOpenDialogFunc} from "../dialog.common";

type RawData = CadLine;
type RawDataLeft = RawData["tiaojianquzhi"][0];
type RawDataRight = RawDataLeft["data"][0];

@Component({
  selector: "app-cad-line-tjqz",
  templateUrl: "./cad-line-tjqz.component.html",
  styleUrls: ["./cad-line-tjqz.component.scss"]
})
export class CadLineTjqzComponent {
  infoLeft: TableRenderInfo<RawDataLeft>;
  infoRight: TableRenderInfo<RawDataRight>;

  @ViewChild("tableLeft") tableLeft?: TableComponent<RawDataLeft>;
  loaderId = "cadLineTiaojianquzhiSavingCad";
  openSelection = {type: "", index: -1};

  newItemLeft: ItemGetter<RawDataLeft> = (rowIdx: number) => ({key: "", level: rowIdx + 1, type: "数值", data: []});

  constructor(
    public dialogRef: MatDialogRef<CadLineTjqzComponent, RawData>,
    @Inject(MAT_DIALOG_DATA) public data: RawData,
    private dialog: MatDialog,
    private message: MessageService,
    private console: CadConsoleService
  ) {
    this.infoLeft = {
      data: cloneDeep(data.tiaojianquzhi),
      columns: [
        {field: "key", name: "名字", type: "string", editable: true},
        {field: "level", name: "优先级", type: "number", editable: true},
        {field: "type", name: "类型", type: "select", options: ["选择", "数值", "数值+选择"], editable: true}
      ],
      title: "条件取值",
      editMode: true,
      newItem: (rowIdx: number) => ({key: "", level: rowIdx + 1, type: "数值", data: []}),
      toolbarButtons: {add: true, remove: true, import: true, export: true},
      validator: (data2) => {
        const result: TableErrorState = [];
        const duplicateLevels: number[] = [];
        const levels: number[] = [];
        const rows: number[] = [];
        data2.data.forEach((v) => {
          if (levels.includes(v.level)) {
            duplicateLevels.push(v.level);
          } else {
            levels.push(v.level);
          }
        });
        data2.data.forEach((v, row) => {
          if (duplicateLevels.includes(v.level)) {
            rows.push(row);
          }
        });
        if (rows.length) {
          result.push({rows, msg: "优先级重复"});
        }
        return result;
      }
      // dataTransformer: (type, data) => {
      //   if (type === "import") {
      //     let maxLevel = -Infinity;
      //     this.infoLeft.data.data.forEach((v) => (maxLevel = Math.max(maxLevel, v.level)));
      //     if (isFinite(maxLevel)) {
      //       data.forEach((v) => {
      //         v.level = ++maxLevel;
      //       });
      //     }
      //   }
      //   return data;
      // }
    };
    this.infoRight = {
      data: [] as RawDataRight[],
      columns: [
        {field: "name", name: "选项/范围", type: "string", editable: true},
        {field: "value", name: "取值", type: "string", editable: true},
        {field: "input", name: "可以输入修改", type: "boolean", editable: true}
      ],
      title: "条件取值数据",
      editMode: true,
      newItem: {name: "", value: 0, input: true},
      toolbarButtons: {add: true, remove: true, import: true, export: true}
    };
  }

  submit() {
    if (this.tableLeft?.errorState.length) {
      this.message.alert("当前数据存在错误");
    } else {
      this.data.tiaojianquzhi = this.infoLeft.data;
      this.console.execute("save", {loaderId: this.loaderId});
    }
  }

  async close() {
    const str1 = JSON.stringify(this.data.tiaojianquzhi);
    const str2 = JSON.stringify(this.infoLeft.data);
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
    this.openSelection = {type, index: type.includes("选择") ? rowIdx : -1};
  }

  onCellClick(event: CellEvent<RawDataLeft>) {
    const {item, rowIdx} = event;
    this.infoRight.data = item.data;
    this.setOpenSelection(item, rowIdx);
    this.infoLeft.activeRows = [rowIdx];
  }

  onCellChange(event: CellEvent<RawDataLeft>) {
    this.setOpenSelection(event.item, event.rowIdx);
  }

  async onCellFocusRight(event: CellEvent<RawDataRight>) {
    const {type, index} = this.openSelection;
    if (event.column.field === "name" && index > -1) {
      const keys = this.infoLeft.data[index].key.split(/;|；|,|，/).filter((v) => v);
      let values: string[];
      if (event.item.name.match(/;|；/)) {
        values = event.item.name.split(/;|；/);
      } else {
        values = event.item.name.split(/,|，/);
      }
      let data: CadLineTjqzSelectData;
      if (keys.length) {
        if (type.includes("数值")) {
          const key = keys.shift() as string;
          const value = values.shift() ?? "";
          data = {
            value: {key, value},
            options: keys.map((v, i) => ({key: v, value: values[i] ?? ""}))
          };
        } else {
          data = {
            options: keys.map((v, i) => ({key: v, value: values[i] ?? ""}))
          };
        }
        const result = await openCadLineTjqzSelectDialog(this.dialog, {data});
        if (result) {
          const arr = result.options;
          if (result.value) {
            arr.unshift(result.value);
          }
          this.infoRight.data[event.rowIdx].name = arr.map((v) => v.value).join(";");
        }
      }
    }
  }
}

export const openCadLineTiaojianquzhiDialog = getOpenDialogFunc<CadLineTjqzComponent, RawData, RawData>(CadLineTjqzComponent);
