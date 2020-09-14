import {Component, OnInit, OnDestroy, Injector} from "@angular/core";
import {CadData} from "@app/cad-viewer/cad-data/cad-data";
import {CadEntities} from "@app/cad-viewer/cad-data/cad-entities";
import {CadLine, CadDimension} from "@app/cad-viewer/cad-data/cad-entity";
import {CadViewerConfig} from "@app/cad-viewer/cad-viewer";
import {CadStatusAction} from "@app/store/actions";
import {getCadStatus} from "@app/store/selectors";
import Color from "color";
import {throttle} from "lodash";
import {openCadDimensionDialog} from "../cad-dimension-form/cad-dimension-form.component";
import {MenuComponent} from "../menu.component";

@Component({
	selector: "app-cad-dimension",
	templateUrl: "./cad-dimension.component.html",
	styleUrls: ["./cad-dimension.component.scss"]
})
export class CadDimensionComponent extends MenuComponent implements OnInit, OnDestroy {
	dimNameFocus = -1;
	dimLineSelecting: number = null;
	prevSelectMode: CadViewerConfig["selectMode"];
	prevLineLength: CadViewerConfig["lineLength"];
	prevLinegongshi: CadViewerConfig["lineGongshi"];

	get dimensions() {
		return this.cad.data.getAllEntities().dimension;
	}

	onEntitiesClick = (async (_event: PointerEvent, entities: CadEntities) => {
		const cad = this.cad;
		const data = cad.data.components.data;
		const {name, index} = await this.getObservableOnce(getCadStatus);
		const dimensions = this.dimensions;
		const entity = entities.line[0];
		if (name === "edit dimension" && entity) {
			let thatData: CadData;
			let thatIndex: number;
			cad.data.components.data.some((d, i) => {
				if (d.findEntity(entity.id)) {
					thatData = d;
					thatIndex = i;
					return true;
				}
				return false;
			});
			for (const d of cad.data.components.data) {
				if (d.findEntity(entity.id)) {
					thatData = d;
					break;
				}
			}
			let dimension = dimensions[index];
			if (!dimension) {
				dimension = new CadDimension();
				dimension.color = new Color(0x00ff00);
				let newIndex = 0;
				for (let i = 0; i < thatIndex; i++) {
					newIndex += data[i].entities.dimension.length;
				}
				newIndex += thatData.entities.dimension.push(dimension) - 1;
				this.store.dispatch<CadStatusAction>({type: "set cad status", index: newIndex});
			}
			if (!dimension.entity1.id) {
				dimension.entity1 = {id: entity.originalId, location: "start"};
				dimension.cad1 = thatData.name;
			} else if (!dimension.entity2.id) {
				dimension.entity2 = {id: entity.originalId, location: "end"};
				dimension.cad2 = thatData.name;
			} else {
				dimension.entity1 = dimension.entity2;
				dimension.entity2 = {id: entity.originalId, location: "end"};
				dimension.cad2 = thatData.name;
			}
			const e1 = cad.data.findEntity(dimension.entity1.id);
			const e2 = cad.data.findEntity(dimension.entity2.id);
			if (e1 instanceof CadLine && e2 instanceof CadLine) {
				const slope1 = e1.slope;
				const slope2 = e2.slope;
				// default axis: x
				if (Math.abs(slope1 - slope2) <= 1) {
					if (Math.abs(slope1) <= 1) {
						dimension.axis = "y";
					} else {
						dimension.axis = "x";
					}
				}
			}
			this.updateDimLines(dimension);
		}
	}).bind(this);

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.getObservable(getCadStatus).subscribe(({name, index}) => {
			const cad = this.cad;
			if (name === "edit dimension") {
				const dimension = this.dimensions[index];
				this.updateDimLines(dimension);
				this.dimLineSelecting = index;
				cad.traverse((e) => {
					if (!(e instanceof CadLine) && e.id !== dimension?.id) {
						e.info.prevSelectable = e.selectable;
						e.info.prevOpacity = e.opacity;
						e.selectable = false;
						e.opacity = 0.3;
					}
				});
				const {lineLength, lineGongshi, selectMode} = cad.config();
				this.prevLineLength = lineLength;
				this.prevLinegongshi = lineGongshi;
				this.prevSelectMode = selectMode;
				cad.config({lineLength: 0, lineGongshi: 0, selectMode: "single"});
			} else if (this.dimLineSelecting !== null) {
				this.dimLineSelecting = null;
				cad.traverse((e) => {
					if (!(e instanceof CadLine)) {
						e.selectable = e.info.prevSelectable ?? true;
						e.opacity = e.info.prevOpacity ?? 1;
						delete e.info.prevSelectable;
						delete e.info.prevOpacity;
					}
				});
				cad.config({lineLength: this.prevLineLength, lineGongshi: this.prevLinegongshi, selectMode: this.prevSelectMode});
			}
		});
		this.cad.on("entitiesselect", this.onEntitiesClick);
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		this.cad.off("entitiesselect", this.onEntitiesClick);
	}

	editDimension(i: number) {
		const {cad, dimensions: data} = this;
		const ref = openCadDimensionDialog(this.dialog, {data: {data: data[i]}, disableClose: true});
		ref.afterClosed().subscribe((dimension) => {
			if (dimension) {
				cad.render();
			}
		});
	}

	getDimensionName(dimension: CadDimension, index: number) {
		if (this.dimNameFocus === index) {
			return dimension.mingzi || "";
		} else {
			return `${dimension.mingzi || ""} ${dimension.qujian || ""}`;
		}
	}

	// tslint:disable-next-line: member-ordering
	setDimensionName = throttle((event: InputEvent, dimension: CadDimension) => {
		const str = (event.target as HTMLInputElement).value;
		dimension.mingzi = str;
		this.cad.render(dimension);
	}, 500);

	async isSelectingDimLine(i: number) {
		const {name, index} = await this.getObservableOnce(getCadStatus);
		return name === "edit dimension" && index === i;
	}

	async selectDimLine(index: number) {
		const cadStatus = await this.getObservableOnce(getCadStatus);
		if (cadStatus.name === "edit dimension" && cadStatus.index === index) {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		} else {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "edit dimension", index});
		}
	}

	addDimension() {
		this.selectDimLine(-1);
	}

	removeDimension(index: number) {
		this.cad.remove(this.dimensions[index]);
	}

	updateDimLines(dimension?: CadDimension) {
		if (!dimension) {
			return;
		}
		const {entity1, entity2} = dimension;
		this.cad
			.traverse((e) => {
				if (e instanceof CadLine) {
					e.selectable = true;
					e.selected = [entity1?.id, entity2?.id].includes(e.originalId);
					e.opacity = 1;
				} else if (e.id === dimension.id) {
					e.opacity = 1;
				} else {
					e.selectable = false;
					e.opacity = 0.3;
				}
			})
			.render();
	}
}
