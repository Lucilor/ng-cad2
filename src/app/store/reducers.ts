import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "@src/environments/environment";
import {cloneDeep} from "lodash";
import {session} from "../app.common";
import {CurrCadsAction, CadStatusAction, CadPointsAction, CommandAction, ConfigAction} from "./actions";
import {initialState, State} from "./state";

export function currCadsReducer(currCads = initialState.currCads, action: CurrCadsAction) {
	const {type, cads} = action;
	if (type === "clear curr cads") {
		return initialState.currCads;
	} else if (type === "set curr cads") {
		return cads;
	} else if (type === "refresh curr cads") {
		return cloneDeep(currCads);
	}
	return currCads;
}

export function cadStatusReducer(cadStatus = initialState.cadStatus, action: CadStatusAction) {
	const {type, name, index, extra} = action;
	if (type === "set cad status") {
		const result = cloneDeep(cadStatus);
		if (name !== undefined) {
			result.name = name;
		}
		if (index !== undefined) {
			result.index = index;
		} else {
			result.index = -1;
		}
		result.extra = extra;
		return result;
	} else if (type === "refresh cad status") {
		return cloneDeep(cadStatus);
	}
	return cadStatus;
}

export function cadPointsReducer(cadPoints = initialState.cadPoints, action: CadPointsAction) {
	const {type, points, indices} = action;
	if (type === "set cad points") {
		return points;
	} else if (type === "activate cad points") {
		return cadPoints.map((v, i) => {
			if (!indices || indices.includes(i)) {
				return {x: v.x, y: v.y, active: true};
			} else {
				return {x: v.x, y: v.y, active: false};
			}
		});
	} else if (type === "unactivate cad points") {
		return cadPoints.map((v, i) => {
			if (!indices || indices.includes(i)) {
				return {x: v.x, y: v.y, active: false};
			} else {
				return {x: v.x, y: v.y, active: true};
			}
		});
	}
	return cadPoints;
}

export function commandReducer(command = initialState.command, action: CommandAction) {
	const {type} = action;
	if (type === "execute") {
		return action.command;
	}
	return command;
}

export function configReducer(config = initialState.config, action: ConfigAction) {
	if (!config) {
		config = {
			width: innerWidth,
			height: innerHeight,
			backgroundColor: "black",
			reverseSimilarColor: true,
			validateLines: false,
			padding: 0,
			dragAxis: "xy",
			selectMode: "multiple",
			entityDraggable: true,
			hideDimensions: false,
			lineGongshi: 8,
			hideLineLength: false,
			hideLineGongshi: false,
			minLinewidth: 2,
			showCadGongshis: true,
			infoTabIndex: 0,
			fontFamily: ""
		};
		const cachedConfig = session.load("config");
		if (cachedConfig) {
			config = {...config, ...cachedConfig};
		}
	} else {
		const {type, config: config2} = action;
		if (type === "set config") {
			config = {...config, ...config2};
		}
		session.save("config", config);
	}
	return config;
}

export const reducers: ActionReducerMap<State> = {
	currCads: currCadsReducer,
	cadStatus: cadStatusReducer,
	cadPoints: cadPointsReducer,
	command: commandReducer,
	config: configReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
