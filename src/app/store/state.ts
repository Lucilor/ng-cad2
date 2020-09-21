import {CadViewerConfig} from "../cad-viewer/cad-viewer";
import {ValuedCommand} from "../components/cad-console/cad-command";

export type CadStatusName = "normal" | "select baseline" | "select jointpoint" | "edit dimension" | "assemble" | "split" | "draw line";

export interface CadStatus {
	name: CadStatusName;
	index: number;
	extra?: any;
}

export interface Config extends CadViewerConfig {
	showCadGongshis: boolean;
	infoTabIndex: number;
}

export interface State {
	loading: {list: Set<string>; progress: number};
	currCads: {cads: string[]; partners: string[]; components: string[]; fullCads: string[]};
	cadStatus: CadStatus;
	cadPoints: {x: number; y: number; active: boolean}[];
	command: ValuedCommand;
	config: Config;
}

export const initialState: State = {
	loading: {list: new Set(), progress: -1},
	currCads: {cads: [], partners: [], components: [], fullCads: []},
	cadStatus: {name: "normal", index: -1},
	cadPoints: [],
	command: null,
	config: null
};
