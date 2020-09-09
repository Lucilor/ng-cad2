import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "@src/environments/environment";
import {cloneDeep} from "lodash";
import {session} from "../app.common";
import {LoadingAction, CurrCadsAction, CadStatusAction, CadPointsAction, CommandAction, ConfigAction} from "./actions";
import {initialState, State} from "./state";

export function loadingReducer(loading = initialState.loading, action: LoadingAction) {
	const newLoading: State["loading"] = cloneDeep(loading);
	if (action.type === "add loading") {
		newLoading.list.add(action.name);
	} else if (action.type === "remove loading") {
		newLoading.list.delete(action.name);
	} else if (action.type === "set loading progress") {
		const progress = action.progress;
		if (progress < 0 || progress > 1) {
			newLoading.list.delete(action.name);
			newLoading.progress = -1;
		} else {
			if (!newLoading.list.has(action.name)) {
				newLoading.list.add(action.name);
			}
			newLoading.progress = progress;
		}
	}
	return newLoading;
}

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
			lineLength: 24,
			lineGongshi: 8,
			hideLineLength: false,
			hideLineGongshi: false,
			showCadGongshis: true,
			minLinewidth: 1
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
	loading: loadingReducer,
	currCads: currCadsReducer,
	cadStatus: cadStatusReducer,
	cadPoints: cadPointsReducer,
	command: commandReducer,
	config: configReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
