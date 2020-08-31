import {CadEntity} from "./cad-entity";
import {CadLayer} from "../cad-layer";
import {getVectorFromArray} from "../utils";
import {Point} from "@src/app/utils";
import {Matrix, MatrixAlias} from "@svgdotjs/svg.js";

export class CadHatch extends CadEntity {
	bgcolor: number[];
	paths: {
		edges: {
			start: Point;
			end: Point;
		}[];
		vertices: Point[];
	}[];

	constructor(data: any = {}, layers: CadLayer[] = [], resetId = false) {
		super(data, layers, resetId);
		this.type = "HATCH";
		this.bgcolor = Array.isArray(data.bgcolor) ? data.bgcolor : [0, 0, 0];
		this.paths = [];
		if (Array.isArray(data.paths)) {
			data.paths.forEach((path) => {
				const edges: CadHatch["paths"][0]["edges"] = [];
				const vertices: CadHatch["paths"][0]["vertices"] = [];
				if (Array.isArray(path.edges)) {
					path.edges.forEach((edge) => {
						const start = getVectorFromArray(edge.start);
						const end = getVectorFromArray(edge.end);
						edges.push({start, end});
					});
				}
				if (Array.isArray(path.vertices)) {
					path.vertices.forEach((vertice) => {
						vertices.push(getVectorFromArray(vertice));
					});
				}
				this.paths.push({edges, vertices});
			});
		}
	}

	export() {
		const paths = [];
		this.paths.forEach((path) => {
			const edges = [];
			const vertices = [];
			path.edges.forEach((edge) => edges.push({start: edge.start.toArray(), end: edge.end.toArray()}));
			path.vertices.forEach((vertice) => vertices.push(vertice.toArray()));
			paths.push({edges, vertices});
		});
		return {...super.export(), paths};
	}

	transform(matrix: MatrixAlias) {
		super.transform(matrix);
		const m = new Matrix(matrix);
		this.paths.forEach((path) => {
			path.edges.forEach((edge) => {
				edge.start.transform(m);
				edge.end.transform(m);
			});
			path.vertices.forEach((vertice) => vertice.transform(m));
		});
		return this;
	}

	clone(resetId = false) {
		return new CadHatch(this, [], resetId);
	}

	equals(entity: CadHatch) {
		// TODO: not yet implemented
		return false;
	}
}
