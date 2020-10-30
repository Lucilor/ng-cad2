import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {CadData} from "@app/cad-viewer/cad-data/cad-data";
import {CadDimension, CadEntities, CadLine} from "@app/cad-viewer/cad-data/cad-entities";
import {CadViewerConfig} from "@app/cad-viewer/cad-viewer";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {AppStatusService} from "@src/app/services/app-status.service";
import {Nullable} from "@src/app/utils/types";
import Color from "color";
import {debounce} from "lodash";
import {openCadDimensionFormDialog} from "../../dialogs/cad-dimension-form/cad-dimension-form.component";

@Component({
	selector: "app-cad-dimension",
	templateUrl: "./cad-dimension.component.html",
	styleUrls: ["./cad-dimension.component.scss"]
})
export class CadDimensionComponent extends Subscribed() implements OnInit, OnDestroy {
	dimNameFocus = -1;
	dimLineSelecting = -1;
	prevConfig: Nullable<CadViewerConfig> = null;
	dimensions: CadDimension[] = [];

	private updateDimensions = (() => {
		this.dimensions = this.status.cad.data.getAllEntities().dimension;
	}).bind(this);

	onEntitiesClick = ((_event: null, entities?: CadEntities) => {
		const cad = this.status.cad;
		const data = cad.data.components.data;
		const {name, index} = this.status.cadStatus();
		const dimensions = this.dimensions;
		const entity = entities?.line[0];
		if (name === "editDimension" && entity) {
			let thatData: Nullable<CadData>;
			let thatIndex = -1;
			cad.data.components.data.some((d, i) => {
				if (d.findEntity(entity.id)) {
					thatData = d;
					thatIndex = i;
					return true;
				}
				return false;
			});
			if (thatIndex < 0 || !thatData) {
				return;
			}
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
				this.status.cadStatus("index", newIndex);
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

	constructor(private status: AppStatusService, private dialog: MatDialog) {
		super();
	}

	ngOnInit() {
		this.subscribe(this.status.cadStatus$, (cadStatus) => {
			const {name, index} = cadStatus;
			const cad = this.status.cad;
			if (name === "editDimension") {
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
				if (!this.prevConfig) {
					this.prevConfig = cad.config();
					cad.config({hideLineLength: true, lineGongshi: 0, selectMode: "single"});
				}
			} else if (this.dimLineSelecting >= 0) {
				this.dimLineSelecting = -1;
				cad.traverse((e) => {
					if (!(e instanceof CadLine)) {
						e.selectable = e.info.prevSelectable ?? true;
						e.opacity = e.info.prevOpacity ?? 1;
						delete e.info.prevSelectable;
						delete e.info.prevOpacity;
					}
				});
				if (this.prevConfig) {
					cad.config(this.prevConfig);
					this.prevConfig = null;
				}
			}
		});
		
		this.updateDimensions();
		const cad = this.status.cad;
		cad.on("entitiesselect", this.onEntitiesClick);
		cad.on("entitiesadd", this.updateDimensions);
		cad.on("entitiesremove", this.updateDimensions);
		cad.on("render", this.updateDimensions);
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		const cad = this.status.cad;
		cad.off("entitiesselect", this.onEntitiesClick);
		cad.off("entitiesadd", this.updateDimensions);
		cad.off("entitiesremove", this.updateDimensions);
		cad.off("render", this.updateDimensions);
	}

	async editDimension(i: number) {
		const dimensions = this.dimensions;
		const dimension = await openCadDimensionFormDialog(this.dialog, {data: {data: dimensions[i]}, disableClose: true});
		if (dimension) {
			this.status.cad.render();
		}
	}

	getDimensionName(dimension: CadDimension, index: number) {
		if (this.dimNameFocus === index) {
			return dimension.mingzi || "";
		} else {
			return `${dimension.mingzi || ""} ${dimension.qujian || ""}`;
		}
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	setDimensionName = debounce((event: Event, dimension: CadDimension) => {
		const str = (event.target as HTMLInputElement).value;
		dimension.mingzi = str;
		this.status.cad.render(dimension);
	}, 500);

	isSelectingDimLine(i: number) {
		const {name, index} = this.status.cadStatus();
		return name === "editDimension" && index === i;
	}

	async selectDimLine(index: number) {
		const cadStatus = this.status.cadStatus();
		if (cadStatus.name === "editDimension" && cadStatus.index === index) {
			this.status.cadStatus("name", "normal");
		} else {
			this.status.cadStatus({name: "editDimension", index});
		}
	}

	addDimension() {
		this.selectDimLine(-1);
	}

	removeDimension(index: number) {
		this.status.cad.remove(this.dimensions[index]);
	}

	updateDimLines(dimension?: CadDimension) {
		if (!dimension) {
			return;
		}
		const {entity1, entity2} = dimension;
		this.status.cad
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
