import {CadViewerConfig} from "../cad-viewer/cad-viewer";
import {ValuedCommand} from "../components/cad-console/cad-command";

export type CadStatusMap = {
	normal: "普通";
	selectBaseline: "选择基准线";
	selectJointpoint: "选择连接点";
	assemble: "装配";
	split: "选取CAD";
	drawLine: "画线";
	editDimension: "编辑标注";
};
export const cadStatusMap: CadStatusMap = {
	normal: "普通",
	selectBaseline: "选择基准线",
	selectJointpoint: "选择连接点",
	assemble: "装配",
	split: "选取CAD",
	drawLine: "画线",
	editDimension: "编辑标注"
};

export interface CadStatus {
	name: keyof CadStatusMap;
	index: number;
	extra?: any;
}

export interface Config extends CadViewerConfig {
	showCadGongshis: boolean;
	infoTabIndex: number;
}

export interface State {
	currCads: {cads: string[]; partners: string[]; components: string[]; fullCads: string[]};
	cadStatus: CadStatus;
	cadPoints: {x: number; y: number; active: boolean}[];
	command: ValuedCommand;
	config: Config;
}

export const initialState: State = {
	currCads: {cads: [], partners: [], components: [], fullCads: []},
	cadStatus: {name: "normal", index: -1},
	cadPoints: [],
	command: null,
	config: null
};
