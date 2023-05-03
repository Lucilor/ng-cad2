import {NavsResultItem} from "@components/dialogs/navs-dialog/navs-dialog.types";
import {Utils} from "@mixins/utils.mixin";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {ObjectOf} from "@utils";
import {cloneDeep} from "lodash";

export interface XinghaoOverviewTableData extends TableDataBase {
  data?: string;
}

export class XinghaoOverviewData extends Utils() {
  sections: XinghaoOverviewSection[] = [];

  constructor(public id: number) {
    super();
  }

  import(data: string) {
    this.sections = [];
    try {
      const data2 = JSON.parse(data);
      for (const section of data2?.sections || []) {
        this.addSection(undefined, section);
      }
    } catch (error) {
      console.error(error);
    }
  }

  export() {
    const sections = cloneDeep(this.sections);
    for (const section of sections) {
      delete section.nameInputInfo;
    }
    return JSON.stringify({sections});
  }

  addSection(index?: number, data?: XinghaoOverviewSection) {
    const section: XinghaoOverviewSection = {name: "", items: []};
    section.nameInputInfo = {type: "string", label: "分组", model: {key: "name", data: section}};
    if (data) {
      section.name = data.name;
      for (const item of data.items || []) {
        this.addItem(section, undefined, item);
      }
    }
    this.arrayAdd(this.sections, section, index);
  }

  removeSection(index: number) {
    this.arrayRemove(this.sections, index);
  }

  addItem(section: XinghaoOverviewSection, index?: number, data?: NavsResultItem) {
    const item: NavsResultItem = {tou: {id: -1, name: ""}, da: {id: -1, name: ""}, xiao: {id: -1, name: "", table: ""}};
    if (data) {
      Object.assign(item, data);
    }
    this.arrayAdd(section.items, item, index);
  }

  removeItem(section: XinghaoOverviewSection, index: number) {
    this.arrayRemove(section.items, index);
  }

  justify(xiaodaohangs: ObjectOf<NavsResultItem>) {
    for (const section of this.sections) {
      const items = section.items;
      section.items = [];
      for (const item of items) {
        const item2 = xiaodaohangs[item.xiao.name];
        if (item2) {
          section.items.push(item2);
        }
      }
    }
  }
}

export interface XinghaoOverviewSection {
  name: string;
  nameInputInfo?: InputInfo;
  items: NavsResultItem[];
}
