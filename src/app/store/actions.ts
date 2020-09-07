import {Action} from "@ngrx/store";
import {State} from "./state";
import {Command} from "@app/app.common";

export type LoadingActionType = "add loading" | "remove loading" | "set loading progress";
export interface LoadingAction extends Action {
	readonly type: LoadingActionType;
	name: string;
	progress?: number;
}

export type CurrCadsActionType = "clear curr cads" | "set curr cads" | "refresh curr cads";
export interface CurrCadsAction extends Action {
	readonly type: CurrCadsActionType;
	cads?: State["currCads"];
}

export type CadStatusActionType = "set cad status" | "refresh cad status";
export interface CadStatusAction extends Action {
	readonly type: CadStatusActionType;
	name?: State["cadStatus"]["name"];
	index?: State["cadStatus"]["index"];
	extra?: State["cadStatus"]["extra"];
}

export type CadPointsActionType = "set cad points" | "activate cad points" | "unactivate cad points";
export interface CadPointsAction extends Action {
	readonly type: CadPointsActionType;
	points?: State["cadPoints"];
	indices?: number[];
}

export type CommandActionType = "execute";
export interface CommandAction extends Action {
	readonly type: CommandActionType;
	command: Command;
}

export type ConfigActionType = "set config";
export interface ConfigAction extends Action {
	readonly type: ConfigActionType;
	config: Partial<State["config"]>;
}
