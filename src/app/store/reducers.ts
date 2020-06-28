import {LoadingAction, CurrCadsAction, CadStatusAction, CadPointsAction} from "./actions";
import {State, initialState} from "./state";
import {ActionReducerMap, MetaReducer} from "@ngrx/store";
import {environment} from "src/environments/environment";
import {cloneDeep} from "lodash";

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
	const {type, name, index} = action;
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
		return result;
	} else if (type === "refresh cad status") {
		return cloneDeep(cadStatus);
	}
	return cadStatus;
}

export function cadPointsReducer(cadPoints = initialState.cadPoints, action: CadPointsAction) {
	const {type, points} = action;
	if (type === "set cad points") {
		return points;
	}
	return cadPoints;
}

export const reducers: ActionReducerMap<State> = {
	loading: loadingReducer,
	currCads: currCadsReducer,
	cadStatus: cadStatusReducer,
	cadPoints: cadPointsReducer
};

export const metaReducers: MetaReducer<State>[] = !environment.production ? [] : [];
