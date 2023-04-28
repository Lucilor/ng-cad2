export interface NavsDialogInput {
  navs?: NavsData;
  multiSelect?: boolean;
}

export type NavsDialogOutput = {
  tou: string;
  da: string;
  xiao: string;
  table: string;
  url: string;
}[];

export type NavsData = NavsDataNodeTou[];

export type NavsDataNode = NavsDataNodeBase & Partial<NavsDataNodeTou> & Partial<NavsDataNodeDa> & Partial<NavsDataNodeXiao>;

export interface NavsDataNodeBase {
  vid: number;
  mingzi: string;
  selected?: boolean;
}

export interface NavsDataNodeTou extends NavsDataNodeBase {
  dadaohang: NavsDataNodeDa[];
}

export interface NavsDataNodeDa extends NavsDataNodeBase {
  xiaodaohang: NavsDataNodeXiao[];
}

export interface NavsDataNodeXiao extends NavsDataNodeBase {
  table: string;
  url: string;
}
