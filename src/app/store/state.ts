export type CadStatusName = "normal" | "select baseline" | "select jointpoint" | "edit dimension" | "assemble";
export interface CadStatus {
	name: CadStatusName;
	index: number;
}

export interface State {
	loading: {list: Set<string>; progress: number};
	currCads: {cads: string[]; partners: string[]; components: string[]};
	cadStatus: CadStatus;
}

export const initialState: State = {
	loading: {list: new Set(), progress: -1},
	currCads: {cads: [], partners: [], components: []},
	cadStatus: {name: "normal", index: -1}
};
