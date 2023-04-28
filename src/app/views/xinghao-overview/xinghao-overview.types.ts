import {Utils} from "@mixins/utils.mixin";
import {TableDataBase} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {cloneDeep} from "lodash";

export interface XinghaoOverviewTableData extends TableDataBase {
  data?: string;
}

export class XinghaoOverviewData extends Utils() {
  id = -1;
  sections: XinghaoOverviewSection[] = [];

  import(data: XinghaoOverviewTableData) {
    this.id = data.vid;
    try {
      const data2 = JSON.parse(data.data || "");
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

  addItem(section: XinghaoOverviewSection, index?: number, data?: XinghaoOverviewItem) {
    const item: XinghaoOverviewItem = {tou: "", da: "", xiao: "", table: "", url: ""};
    if (data) {
      Object.assign(item, data);
    }
    this.arrayAdd(section.items, item, index);
  }

  removeItem(section: XinghaoOverviewSection, index: number) {
    this.arrayRemove(section.items, index);
  }
}

export interface XinghaoOverviewSection {
  name: string;
  nameInputInfo?: InputInfo;
  items: XinghaoOverviewItem[];
}

export interface XinghaoOverviewItem {
  tou: string;
  da: string;
  xiao: string;
  table: string;
  url: string;
}
