import {TableDataBase, TableRenderData} from "@modules/http/services/cad-data.service.types";

export interface DingdanBomData extends TableDataBase {
  dingdanbianhao: string;
  xinghaobianma: string;
  fuji?: number;
  expanded?: boolean;
  children?: DingdanBomData[];
  suanliaocad?: string | null;
  kailiaocad?: string | null;
  shicadjiegouliao?: number;
}

export interface DingdanBomCacheData {
  dataRaw: DingdanBomData[];
  tableRenderData: TableRenderData | null;
}
