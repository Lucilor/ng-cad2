import {XiaodaohangStructure} from "@app/app.common";
import {CadData} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {BancaiList, TableDataBase} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/input.types";
import {difference, isEqual} from "lodash";

export interface MrbcjfzResponseData {
  xinghao: MrbcjfzXinghao;
  cads: any[];
  huajians: MrbcjfzHuajian[];
  qiliaos: TableDataBase[];
  bancaiKeys: string[];
  bancaiKeysNonClear: string[];
  bancaiKeysRequired: string[];
  bancaiList: BancaiList[];
  xiaodaohangStructure: XiaodaohangStructure;
}

export interface MrbcjfzXinghao extends TableDataBase {
  morenbancai?: string;
  gongshishuru?: string;
  编辑默认对应板材分组?: boolean;
}

export interface MrbcjfzHuajian extends TableDataBase {
  xiaotu?: string;
  shihuajian?: number;
  bangdingqianbankuanshicad?: string;
  bangdinghoubankuanshicad?: string;
}

export class MrbcjfzXinghaoInfo {
  默认板材: ObjectOf<MrbcjfzInfo> = {};
  inputInfos: ObjectOf<InputInfo[]> = {};

  constructor(
    public table: string,
    public raw: MrbcjfzXinghao
  ) {
    try {
      this.默认板材 = JSON.parse(raw.morenbancai || "");
    } catch (error) {}
    this.update();
  }

  update() {
    this.inputInfos = {};
    for (const key in this.默认板材) {
      this.默认板材[key] = {...getEmptyMrbcjfzInfo(key), ...this.默认板材[key]};
      const value = this.默认板材[key];
      const showItemOptions = ["全都显示", "只显示颜色", "全不显示"] as const;
      let 显示内容: (typeof showItemOptions)[number] | undefined;
      if (value.不显示) {
        if (value.不显示内容 && value.不显示内容.length > 0) {
          const showItems = difference(mrbcjfzInfoShowItems, value.不显示内容, ["颜色"]);
          if (showItems.length > 0) {
            显示内容 = "全都显示";
          } else {
            显示内容 = "只显示颜色";
          }
        } else {
          显示内容 = "全不显示";
        }
      } else {
        显示内容 = "全都显示";
      }
      this.inputInfos[key] = [
        {
          type: "string",
          label: "板材分组别名",
          model: {data: value, key: "板材分组别名"},
          styles: {flex: "1 1 20px"},
          validators: (control) => {
            const val = String(control.value);
            if (["p_luomatou", "p_luomazhu", "p_qianhoubankuanshi"].includes(this.table)) {
              const data = this.默认板材[key];
              if (!isMrbcjfzInfoEmpty1(key, data) && !val) {
                return {required: true};
              }
            }
            if (val && !/板材|颜色$/.test(val)) {
              return {pattern: "必须以“板材”或“颜色”结尾"};
            }
            return null;
          }
        },
        {type: "boolean", label: "允许修改", model: {data: value, key: "允许修改"}, styles: {flex: "1 1 9px"}},
        {
          type: "boolean",
          label: "独立变化",
          model: {data: value, key: "独立变化"},
          styles: {flex: "1 1 9px"},
          readonly: key === "底框板材"
        },
        {
          type: "select",
          label: "显示内容",
          options: showItemOptions.slice(),
          value: 显示内容,
          styles: {flex: "1 1 12px"},
          onChange: (val: string) => {
            switch (val) {
              case "全都显示":
                value.不显示 = false;
                delete value.不显示内容;
                break;
              case "只显示颜色":
                value.不显示 = true;
                value.不显示内容 = ["材料", "厚度"];
                break;
              case "全不显示":
                value.不显示 = true;
                value.不显示内容 = ["颜色", "材料", "厚度"];
                break;
              default:
                console.error("未知的显示内容选项", val);
            }
            const info = this.inputInfos[key].find((v) => v.label === "显示内容");
            if (info && info.styles) {
              info.styles.opacity = value.不显示 ? "0.5" : "1";
            }
          }
        }
      ];
      if (this.raw.编辑默认对应板材分组) {
        this.inputInfos[key].push({
          type: "select",
          label: "默认对应板材分组",
          model: {data: value, key: "默认对应板材分组"},
          styles: {flex: "1 1 40px"},
          options: ["门框板材", "门扇板材"],
          clearable: true
        });
      }
    }
  }

  getBancaiTitle(key: string, placeholder = "") {
    const info = this.默认板材[key];
    if (!info) {
      return "";
    }
    const {默认开料板材, 默认开料材料, 默认开料板材厚度, 选中板材, 选中材料, 选中板材厚度} = info;
    const arr1 = [默认开料板材, 默认开料材料, 默认开料板材厚度].filter(Boolean);
    const arr2 = [选中板材, 选中材料, 选中板材厚度].filter(Boolean);
    if (arr2.length > 0) {
      return arr2.join("/");
    } else if (arr1.length > 0) {
      return arr1.join("/");
    }
    return placeholder;
  }
}

export interface MrbcjfzInfo {
  默认开料板材: string;
  默认开料材料: string;
  默认开料板材厚度: string;
  默认对应板材分组: string;
  选中板材: string;
  选中材料: string;
  选中板材厚度: string;
  选中板材分组: string;
  可选板材: string[];
  花件: string[];
  CAD: string[];
  企料: string[];
  板材分组别名?: string;
  允许修改?: boolean;
  独立变化?: boolean;
  不显示?: boolean;
  不显示内容?: MrbcjfzInfoShowItem[];
}

export const mrbcjfzInfoShowItems = ["颜色", "材料", "厚度"] as const;
export type MrbcjfzInfoShowItem = (typeof mrbcjfzInfoShowItems)[number];

export const getMrbcjfzInfo = (source: Partial<MrbcjfzInfo> = {}): MrbcjfzInfo => ({
  默认开料板材: "",
  默认开料材料: "",
  默认开料板材厚度: "",
  默认对应板材分组: "",
  选中板材: "",
  选中材料: "",
  选中板材厚度: "",
  选中板材分组: "",
  可选板材: [],
  花件: [],
  CAD: [],
  企料: [],
  ...source
});

export interface MrbcjfzBancaiInputs {
  bancai: InputInfo<MrbcjfzInfo>;
  cailiao: InputInfo<MrbcjfzInfo>;
  houdu: InputInfo<MrbcjfzInfo>;
}

export interface MrbcjfzListItem {
  id: string;
  selected?: boolean;
  isVirtual?: boolean;
}

export const listItemKeys = ["CAD", "花件", "企料"] as const;
export type ListItemKey = (typeof listItemKeys)[number];

export interface MrbcjfzCadInfo extends MrbcjfzListItem {
  data: CadData;
  img: string;
}

export interface MrbcjfzHuajianInfo extends MrbcjfzListItem {
  data: MrbcjfzHuajian;
}

export interface MrbcjfzQiliaoInfo extends MrbcjfzListItem {
  data: TableDataBase;
}

export const filterCad = (info: MrbcjfzCadInfo) => {
  const data = info.data;
  if (data.gudingkailiaobancai || data.板材绑定选项) {
    return false;
  }
  const typeReg = /激光花|花件|示意图|装配示意图|特定企料|横截面示意图|纵截面示意图/;
  if (typeReg.test(data.type) || typeReg.test(data.type2)) {
    return false;
  }
  if (data.options.花件 || Object.keys(data.options).some((v2) => v2.includes("压条"))) {
    return false;
  }
  return true;
};

export const filterHuajian = (info: MrbcjfzHuajianInfo) => {
  const data = info.data;
  if (data.shihuajian || data.bangdinghoubankuanshicad || data.bangdingqianbankuanshicad) {
    return false;
  }
  if (/阴影/.test(data.mingzi)) {
    return false;
  }
  const getProperHuajianName = (rawName: string) => {
    if (!rawName) return "";

    let newName = rawName;

    const newNameParts = newName.split("-"); // 两段或以上的，第一段基本都是做法名字，直接去掉

    if (newNameParts.length > 1) {
      newNameParts.shift();

      newName = newNameParts.join("-");
    }
    /**
     * 门扇做法有叫以下名字的话，会影响到上下板花件的判断
     * 无上下板、有上下板
     * +压条、加压条、无压条
     */
    newName = newName.replace(/无上下板|有上下板|\+压条|加压条|无压条|拉手板/g, "");
    return newName;
  };
  const mingziReg = /压条|压边|门徽|猫眼|LOGO|商标|花件|木板|门铰|拉手|企料开槽饰条/;
  if (mingziReg.test(getProperHuajianName(data.mingzi))) {
    return false;
  }
  return true;
};

export const getEmptyMrbcjfzInfo = (name: string) => {
  const result: MrbcjfzInfo = {
    默认开料板材: "",
    默认开料材料: "",
    默认开料板材厚度: "",
    默认对应板材分组: "",
    选中板材: "",
    选中材料: "",
    选中板材厚度: "",
    选中板材分组: "",
    可选板材: [],
    花件: [],
    CAD: [],
    企料: [],
    板材分组别名: "",
    允许修改: true,
    独立变化: false,
    不显示: false
  };
  if (name === "底框板材") {
    result.独立变化 = true;
  }
  return result;
};

export const emptyMrbcjfzInfoValues = (name: string, info: MrbcjfzInfo, keys: (keyof MrbcjfzInfo)[]) => {
  const emptyInfo = getEmptyMrbcjfzInfo(name);
  for (const key of keys) {
    info[key] = emptyInfo[key] as never;
  }
};

export const isMrbcjfzInfoEmpty = (name: string, info: MrbcjfzInfo, keys: (keyof MrbcjfzInfo)[]) => {
  const emptyInfo = getEmptyMrbcjfzInfo(name);
  return keys.every((key) => {
    const value = info[key];
    if (value === undefined || isEqual(value, emptyInfo[key])) {
      return true;
    }
    return false;
  });
};

export const isMrbcjfzInfoEmpty1 = (name: string, info: MrbcjfzInfo) => isMrbcjfzInfoEmpty(name, info, ["CAD", "企料", "花件"]);
export const isMrbcjfzInfoEmpty2 = (name: string, info: MrbcjfzInfo) =>
  isMrbcjfzInfoEmpty(name, info, ["默认开料材料", "默认开料板材", "默认开料板材厚度"]);
