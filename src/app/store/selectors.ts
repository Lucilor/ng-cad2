import {State} from "./state";
import {difference} from "lodash";
import {CadData} from "../cad-viewer/cad-data/cad-data";

export const getLoading = ({loading}: State) => loading;

export const getCurrCads = ({currCads}: State) => currCads;

export function getCurrCadsData(data: CadData, currCads: State["currCads"]) {
	const {partners, components, fullCads} = currCads;
	const fullCadsData = data.findChildren(fullCads);
	let childrenIds: string[] = [];
	fullCadsData.forEach((v) => {
		childrenIds = childrenIds.concat(v.partners.map((vv) => vv.id));
		childrenIds = childrenIds.concat(v.components.data.map((vv) => vv.id));
	});
	const ids = [...fullCads, ...difference([...partners, ...components], childrenIds)];
	return data.findChildren(ids);
}

export const getCadStatus = ({cadStatus}: State) => cadStatus;

export const getCadPoints = ({cadPoints}: State) => cadPoints;
