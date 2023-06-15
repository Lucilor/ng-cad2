import {animate, state, style, transition, trigger} from "@angular/animations";
import {Component, OnInit, ViewChild} from "@angular/core";
import {Validators} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {session, setGlobal} from "@app/app.common";
import {environment} from "@env";
import {timeout} from "@lucilor/utils";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {TableInsertParams, TableRenderData} from "@modules/http/services/cad-data.service.types";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {TableComponent} from "@modules/table/components/table/table.component";
import {RowButtonEvent, TableRenderInfo} from "@modules/table/components/table/table.types";
import {convertTableRenderData, getInputInfosFromTableColumns} from "@modules/table/components/table/table.utils";
import {mapKeys} from "lodash";
import {DingdanBomCacheData, DingdanBomData} from "./bom-gongyiluxian.types";

@Component({
  selector: "app-bom-gongyiluxian",
  templateUrl: "./bom-gongyiluxian.component.html",
  styleUrls: ["./bom-gongyiluxian.component.scss"],
  animations: [
    trigger("detailExpand", [
      state("collapsed", style({height: "0px", minHeight: "0"})),
      state("expanded", style({height: "*"})),
      transition("expanded <=> collapsed", animate("225ms cubic-bezier(0.4, 0.0, 0.2, 1)"))
    ])
  ]
})
export class BomGongyiluxianComponent implements OnInit {
  table = "b_dingdanbom";
  tableRenderData: TableRenderData | null = null;
  dataRaw: DingdanBomData[] = [];
  info: TableRenderInfo<DingdanBomData> = {
    data: [],
    columns: [{type: "string", field: "mingzi", name: "名称"}],
    toolbarButtons: {editModeToggle: true},
    noCheckBox: true,
    isTree: true,
    onlineMode: {tableName: this.table, refresh: () => this.refresh(true)}
  };
  private _cacheKey = "bomGongyiluxianCache";
  environment = environment;

  @ViewChild("table") tableComponent?: TableComponent<DingdanBomData>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private message: MessageService,
    private dataService: CadDataService,
    private spinner: SpinnerService
  ) {
    setGlobal("bomGongyiluxian", this);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(() => {
      this.refresh();
    });
  }

  async refresh(clearCache = false) {
    let {code} = this.route.snapshot.queryParams;
    if (!code) {
      code = await this.message.prompt({type: "string", label: "订单编号", validators: Validators.required});
      if (code) {
        this.router.navigate([], {queryParams: {code}, queryParamsHandling: "merge"});
      }
    }
    if (!code) {
      return;
    }
    if (clearCache) {
      this.clearCache();
    }
    const {table} = this;
    let dataRaw: DingdanBomData[];
    let tableRenderData: TableRenderData | null = null;
    if (this.loadCache()) {
      dataRaw = this.dataRaw;
      tableRenderData = this.tableRenderData;
    } else {
      this.spinner.show(this.spinner.defaultLoaderId);
      const response = await this.dataService.post<DingdanBomData[]>("ngcad/getDingdanBomData", {table, code});
      dataRaw = this.dataService.getResponseData(response) || [];
      tableRenderData = await this.dataService.getTableRenderData(table);
      this.spinner.hide(this.spinner.defaultLoaderId);
      this.dataRaw = dataRaw;
      this.tableRenderData = tableRenderData;
      this.saveCache();
    }
    const data2: DingdanBomData[] = [];
    const dataMap = mapKeys(dataRaw, "vid");
    for (const item of dataRaw) {
      const fuji = item.fuji;
      if (fuji === 0) {
        data2.push(item);
      } else if (typeof fuji === "number") {
        const parent = dataMap[fuji];
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(item);
        }
      }
    }
    this.info.data = data2;
    if (tableRenderData) {
      convertTableRenderData(tableRenderData, this.info);
      for (const column of this.info.columns) {
        if (["suanliaocad", "kailiaocad"].includes(column.field)) {
          column.type = "cad";
          column.hidden = false;
          if (column.type === "cad") {
            column.filterFn = (event) => !!event.item.shicadjiegouliao;
          }
        }
      }
      // this.info.columns[0].sticky = true;
      this.info.columns.splice(1, 0, {
        type: "button",
        field: "children",
        name: "操作",
        buttons: [{event: "add", title: "添加", color: "primary"}],
        width: "80px"
      });
    }
    await timeout(0);
    const treeControl = this.tableComponent?.treeControl;
    if (treeControl) {
      treeControl.expand(treeControl.dataNodes[0]);
    }
  }

  loadCache() {
    if (environment.production) {
      return false;
    }
    const cachedData = session.load<DingdanBomCacheData>(this._cacheKey);
    if (cachedData) {
      this.dataRaw = cachedData.dataRaw;
      this.tableRenderData = cachedData.tableRenderData;
      return true;
    }
    return false;
  }

  saveCache() {
    if (environment.production) {
      return;
    }
    session.save<DingdanBomCacheData>(this._cacheKey, {dataRaw: this.dataRaw, tableRenderData: this.tableRenderData});
  }

  clearCache() {
    session.remove(this._cacheKey);
  }

  async addItem(fromItem: DingdanBomData) {
    const keys: (keyof DingdanBomData)[] = ["dingdanbianhao", "fuji", "xinghaobianma"];
    const columns = this.info.columns.filter((v) => v.required && !keys.includes(v.field));
    const values = await this.message.form(getInputInfosFromTableColumns(columns));
    const item = this.dataRaw[0];
    if (values) {
      for (const key of keys) {
        values[key] = fromItem[key];
      }
      const data: TableInsertParams<DingdanBomData> = {
        table: this.table,
        data: values
      };
      await this.dataService.tableInsert(data);
      this.refresh(true);
    }
    return item;
  }

  onRowButtonClick(event: RowButtonEvent<DingdanBomData>) {
    switch (event.button.event) {
      case "add":
        this.addItem(event.item);
        break;
    }
  }
}
