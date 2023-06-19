import {CadBaseLine, CadData, CadJointPoint} from "@lucilor/cad-viewer";
import {ObjectOf} from "@lucilor/utils";
import {CadCollection} from "./collections";
import {cadOptions} from "./options";
import {isShiyitu} from "./utils";

export const setCadData = (data: CadData, project: string, collection: CadCollection) => {
  if (data.baseLines.length < 1) {
    data.baseLines.push(new CadBaseLine());
  }
  if (data.jointPoints.length < 1) {
    data.jointPoints.push(new CadJointPoint());
  }
  if (data.算料单线长显示的最小长度 === null) {
    data.算料单线长显示的最小长度 = project === "yhmy" ? 5 : 6;
  }
  if (isShiyitu(data) || collection === "luomatoucad") {
    data.info.skipSuanliaodanZoom = true;
  } else {
    delete data.info.skipSuanliaodanZoom;
  }
  data.entities.forEach((e) => {
    if (e.layer === "分页线") {
      e.calcBoundingRect = false;
    }
  });

  data.info.激光开料是否翻转 = !!data.info.激光开料是否翻转;
  if (!Array.isArray(data.info.激光开料标记线)) {
    data.info.激光开料标记线 = [];
  }

  const dataAny = data as ObjectOf<any>;
  for (const key in cadOptions) {
    if (!(key in dataAny)) {
      console.warn("Key error: " + key);
    }
    if (typeof dataAny[key] !== "string") {
      dataAny[key] = "";
    }
    const key2 = key as keyof typeof cadOptions;
    const values = cadOptions[key2].values.map((v) => (typeof v === "string" ? v : v.value));
    if (!values.includes(dataAny[key])) {
      dataAny[key] = cadOptions[key2].defaultValue;
    }
  }
  return data;
};

export const unsetCadData = (data: CadData) => {
  if (!data.info.激光开料是否翻转) {
    delete data.info.激光开料是否翻转;
  }
  if (data.info.激光开料标记线 && data.info.激光开料标记线.length < 1) {
    delete data.info.激光开料标记线;
  }
};
