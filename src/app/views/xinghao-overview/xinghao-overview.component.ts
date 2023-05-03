import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {Component, OnInit} from "@angular/core";
import {Validators} from "@angular/forms";
import {setGlobal} from "@app/app.common";
import {NavsData, NavsDataNode, NavsResultItem} from "@components/dialogs/navs-dialog/navs-dialog.types";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {ObjectOf, WindowMessageManager, downloadByString} from "@utils";
import {XinghaoOverviewData, XinghaoOverviewTableData} from "./xinghao-overview.types";

@Component({
  selector: "app-xinghao-overview",
  templateUrl: "./xinghao-overview.component.html",
  styleUrls: ["./xinghao-overview.component.scss"]
})
export class XinghaoOverviewComponent implements OnInit {
  table = "p_xinghaoshujukuaisupeizhi";
  data = new XinghaoOverviewData(-1);
  navs: NavsData = [];
  xiaodaohangs: ObjectOf<NavsResultItem> = {};
  wmm = new WindowMessageManager("xinghaoOverview", this, window.parent);

  constructor(private spinner: SpinnerService, private dataService: CadDataService, private message: MessageService) {
    setGlobal("xinghaoOverview", this);
  }

  async ngOnInit() {
    this.spinner.show(this.spinner.defaultLoaderId);
    let records = await this.dataService.queryMySql<XinghaoOverviewTableData>({table: this.table, limit: 1});
    if (!records[0]) {
      await this.dataService.tableInsert<XinghaoOverviewTableData>({table: this.table, data: {data: "{}"}});
      records = await this.dataService.queryMySql<XinghaoOverviewTableData>({table: this.table, limit: 1});
    }
    if (records[0]) {
      this.data.id = records[0].vid;
      this.data.import(records[0].data || "");
    } else {
      this.message.error("数据错误");
    }
    const navsResponse = await this.dataService.post<NavsData>("ngcad/getNavs");
    this.navs = this.dataService.getResponseData(navsResponse) || [];
    const printedNavs = new Set<string>();
    const printNav = (item: NavsResultItem) => {
      const {tou, da, xiao} = item;
      const str = `${tou.name}(${tou.id})->${da.name}(${da.id})->${xiao.name}(${xiao.id})`;
      if (!printedNavs.has(str)) {
        console.warn(`小导航重复: ${str}`);
        printedNavs.add(str);
      }
    };
    const addXiaodaohang = (node: NavsDataNode, tou?: NavsResultItem["tou"], da?: NavsResultItem["da"]) => {
      if (node.dadaohang) {
        for (const node2 of node.dadaohang) {
          addXiaodaohang(node2, {id: node.vid, name: node.mingzi});
        }
      }
      if (node.xiaodaohang) {
        for (const node2 of node.xiaodaohang) {
          addXiaodaohang(node2, tou, {id: node.vid, name: node.mingzi});
        }
      }
      if (tou && da) {
        const name = node.mingzi;
        const item: NavsResultItem = {tou, da, xiao: {id: node.vid, name, table: node.table || ""}};
        if (name in this.xiaodaohangs) {
          printNav(this.xiaodaohangs[name]);
          printNav(item);
        }
        this.xiaodaohangs[name] = item;
      }
    };
    for (const tou of this.navs) {
      addXiaodaohang(tou);
    }
    this.data.justify(this.xiaodaohangs);
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  addNavSection() {
    this.data.addSection();
  }

  async removeNavSection(i: number) {
    if (!(await this.message.confirm("确定删除？"))) {
      return;
    }
    this.data.removeSection(i);
  }

  async addNavItem(i: number, j?: number) {
    const currNames: string[] = [];
    for (const section of this.data.sections) {
      for (const item of section.items) {
        currNames.push(item.xiao.name);
      }
    }
    const options = Object.keys(this.xiaodaohangs).filter((xiao) => !currNames.includes(xiao));
    const result = await this.message.prompt({
      type: "string",
      label: "小导航",
      options,
      optionInputOnly: true,
      optionsDisplayLimit: 10,
      filterValuesGetter: (option) => {
        const key = typeof option === "string" ? option : option.value;
        const item = this.xiaodaohangs[key];
        if (item) {
          const {name, table} = item.xiao;
          return [name, table];
        }
        return [];
      },
      validators: Validators.required
    });
    {
      const item = this.xiaodaohangs[result];
      if (item) {
        this.data.addItem(this.data.sections[i], j, item);
      }
    }
  }

  async removeNavItem(i: number, j: number) {
    if (!(await this.message.confirm("确定删除？"))) {
      return;
    }
    this.data.removeItem(this.data.sections[i], j);
  }

  async openNavItem(item: NavsResultItem) {
    this.wmm.postMessage("openNavItemStart", item);
    await this.wmm.waitForMessage("openNavItemEnd");
  }

  onItemClick(item: NavsResultItem) {
    this.openNavItem(item);
  }

  onItemDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
  }

  async submit() {
    const data = this.data.export();
    this.spinner.show(this.spinner.defaultLoaderId);
    this.dataService.tableUpdate<XinghaoOverviewTableData>({table: this.table, tableData: {vid: this.data.id, data}});
    this.spinner.hide(this.spinner.defaultLoaderId);
  }

  import() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const data = await file.text();
        this.data.import(data);
        this.data.justify(this.xiaodaohangs);
      }
    };
    input.click();
  }

  export() {
    const data = this.data.export();
    downloadByString(data, {filename: document.title + ".json"});
  }
}
