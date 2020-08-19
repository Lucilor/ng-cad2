import {CadLine} from "./cad-entity/cad-line";
import {CadCircle} from "./cad-entity/cad-circle";
import {CadArc} from "./cad-entity/cad-arc";
import {CadMtext} from "./cad-entity/cad-mtext";
import {CadDimension} from "./cad-entity/cad-dimension";
import {CadHatch} from "./cad-entity/cad-hatch";
import {CadLayer} from "./cad-layer";
import {CadTypeKey, cadTypesKey} from "./cad-types";
import {CadEntity} from "./cad-entity/cad-entity";
import {CadTransformation} from "./cad-transformation";
import {mergeArray, separateArray} from "./utils";

export class CadEntities {
	line: CadLine[] = [];
	circle: CadCircle[] = [];
	arc: CadArc[] = [];
	mtext: CadMtext[] = [];
	dimension: CadDimension[] = [];
	hatch: CadHatch[] = [];

	get length() {
		let result = 0;
		this.forEachType((array) => (result += array.length));
		return result;
	}
	get children() {
		const children = new CadEntities();
		this.forEach((e) => {
			e.children.forEach((c) => {
				children.add(c);
				children.merge(new CadEntities().add(c).children);
			});
		});
		return children;
	}

	constructor(data: any = {}, layers: CadLayer[] = [], resetIds = false) {
		if (typeof data !== "object") {
			throw new Error("Invalid data.");
		}
		cadTypesKey.forEach((key) => {
			const group = data[key];
			if (Array.isArray(group)) {
				group.forEach((v) => this[key].push(v.clone(resetIds)));
			} else if (typeof group === "object") {
				if (key === "arc") {
					Object.values(group).forEach((v) => this[key].push(new CadArc(v, layers, resetIds)));
				} else if (key === "circle") {
					Object.values(group).forEach((v) => this[key].push(new CadCircle(v, layers, resetIds)));
				} else if (key === "dimension") {
					Object.values(group).forEach((v) => this[key].push(new CadDimension(v, layers, resetIds)));
				} else if (key === "hatch") {
					Object.values(group).forEach((v) => this[key].push(new CadHatch(v, layers, resetIds)));
				} else if (key === "line") {
					Object.values(group).forEach((v) => this[key].push(new CadLine(v, layers, resetIds)));
				} else if (key === "mtext") {
					Object.values(group).forEach((v) => this[key].push(new CadMtext(v, layers, resetIds)));
				}
			}
		});
	}

	merge(entities: CadEntities) {
		cadTypesKey.forEach((key: string) => {
			this[key] = mergeArray(this[key], entities[key], "id");
		});
		return this;
	}

	separate(entities: CadEntities) {
		cadTypesKey.forEach((key: string) => {
			this[key] = separateArray(this[key], entities[key], "id");
		});
		return this;
	}

	find(id: string) {
		for (const key of cadTypesKey) {
			for (const entity of this[key] as CadEntity[]) {
				if (entity.id === id || entity.originalId === id) {
					return entity;
				}
				for (const child of entity.children) {
					if (child.id === id || child.originalId === id) {
						return child;
					}
				}
			}
		}
		return null;
	}

	filter(callback: (value: CadEntity, index: number, array: CadEntity[]) => boolean) {
		const result = new CadEntities();
		for (const key of cadTypesKey) {
			result[key] = (this[key] as CadEntity[]).filter(callback) as any;
		}
		return result;
	}

	export() {
		const result = {line: {}, circle: {}, arc: {}, mtext: {}, dimension: {}, hatch: {}};
		for (const key of cadTypesKey) {
			this[key].forEach((e: CadEntity) => {
				if (e instanceof CadDimension) {
					if (e.entity1.id && e.entity2.id) {
						result[key][e.id] = e.export();
					}
				} else {
					result[key][e.id] = e.export();
				}
			});
		}
		return result;
	}

	clone(resetIds = false) {
		return new CadEntities(this, [], resetIds);
	}

	transform(trans: CadTransformation) {
		for (const key of cadTypesKey) {
			(this[key] as CadEntity[]).forEach((e) => e.transform(trans));
		}
	}

	forEachType(callback: (array: CadEntity[], type: CadTypeKey, TYPE: string) => void, include?: CadTypeKey[]) {
		for (const key of cadTypesKey) {
			if (!include || include?.includes(key)) {
				callback(this[key], key, key.toUpperCase());
			}
		}
	}

	forEach(callback: (value: CadEntity, index: number, array: CadEntity[]) => void, include?: CadTypeKey[]) {
		this.forEachType((array) => array.forEach(callback), include);
	}

	toArray() {
		const result: CadEntity[] = [];
		this.forEach((e) => result.push(e));
		return result;
	}

	add(entity: CadEntity) {
		if (entity instanceof CadEntity) {
			this.forEachType((array, type, TYPE) => {
				if (TYPE === entity.type) {
					array.push(entity);
				}
			});
		}
		return this;
	}

	remove(entity: CadEntity) {
		if (entity instanceof CadEntity) {
			const id = entity.id;
			this.forEachType((array) => {
				const index = array.findIndex((e) => e.id === id);
				if (index > -1) {
					array.splice(index, 1);
				}
			});
		}
		return this;
	}
}
