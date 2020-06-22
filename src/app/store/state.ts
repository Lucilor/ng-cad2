export type CadStatusName = "normal" | "select baseline" | "select jointpoint" | "edit dimension" | "assemble";
export interface CadStatus {
	name: CadStatusName;
	index: number;
}

export interface State {
	loading: {list: Set<string>; progress: number};
	currCads: {[key: string]: {self: boolean; full: boolean; partners: string[]; components: string[]}};
	cadStatus: CadStatus;
}

export const initialState: State = {
	loading: {list: new Set(), progress: -1},
	currCads: {},
	cadStatus: {name: "normal", index: -1}
};
