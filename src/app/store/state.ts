import {Command} from "../app.common";
export type CadStatusName = "normal" | "select baseline" | "select jointpoint" | "edit dimension" | "assemble" | "split" | "draw line";

export interface CadStatus {
	name: CadStatusName;
	index: number;
	extra?: any;
}

export interface State {
	loading: {list: Set<string>; progress: number};
	currCads: {cads: string[]; partners: string[]; components: string[]; fullCads: string[]};
	cadStatus: CadStatus;
	cadPoints: {x: number; y: number; active: boolean}[];
	command: Command;
}

export const initialState: State = {
	loading: {list: new Set(), progress: -1},
	currCads: {cads: [], partners: [], components: [], fullCads: []},
	cadStatus: {name: "normal", index: -1},
	cadPoints: [],
	command: null
};
