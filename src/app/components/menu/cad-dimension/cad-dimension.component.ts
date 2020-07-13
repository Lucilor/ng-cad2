import {Component, OnInit, OnDestroy, Injector} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";
import {CadDimensionFormComponent} from "../cad-dimension-form/cad-dimension-form.component";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadStatusAction} from "@src/app/store/actions";
import {take, takeUntil} from "rxjs/operators";
import {MenuComponent} from "../menu.component";

@Component({
	selector: "app-cad-dimension",
	templateUrl: "./cad-dimension.component.html",
	styleUrls: ["./cad-dimension.component.scss"]
})
export class CadDimensionComponent extends MenuComponent implements OnInit, OnDestroy {
	dimNameFocus = -1;
	dimLineSelecting: number = null;
	get dimensions() {
		return this.cad.data.getAllEntities().dimension;
	}
	// get selectedDimensions() {
	// 	return this.dimensions.filter((e) => e.selected);
	// }

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		const {cad} = this;
		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe(({name, index}) => {
			if (name === "assemble") {
				return index;
			}
			return -1;
		});
		cad.controls.on("entityselect", async (event, entity) => {
			const data = cad.data.components.data;
			const {name, index} = await this.cadStatus.pipe(take(1)).toPromise();
			const dimensions = this.dimensions;
			if (name === "edit dimension" && entity instanceof CadLine) {
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
					dimension.color.set(0x00ff00);
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
				cad.data.updateComponents();
				cad.render();
			}
		});
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	editDimension(i: number) {
		const {cad, dimensions: data} = this;
		const ref: MatDialogRef<CadDimensionFormComponent, CadDimension> = this.dialog.open(CadDimensionFormComponent, {
			data: {data: data[i]},
			disableClose: true
		});
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

	setDimensionName(event: InputEvent, dimension: CadDimension) {
		const str = (event.target as HTMLInputElement).value;
		dimension.mingzi = str;
		this.cad.render();
	}

	async isSelectingDimLine(index: number) {
		const cadStatus = await this.cadStatus.pipe(take(1)).toPromise();
		return cadStatus.name === "edit dimension" && cadStatus.index === index;
	}

	async selectDimLine(index: number) {
		const {cad, dimensions: data} = this;
		const cadStatus = await this.cadStatus.pipe(take(1)).toPromise();
		if (cadStatus.name === "edit dimension" && cadStatus.index === index) {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
			this.dimLineSelecting = null;
		} else {
			this.store.dispatch<CadStatusAction>({type: "set cad status", name: "edit dimension", index});
			const {entity1, entity2} = data[index] || {};
			cad.traverse((e) => {
				if (e instanceof CadLine) {
					e.selectable = true;
					e.selected = [entity1?.id, entity2?.id].includes(e.id);
					e.opacity = 1;
				} else if (e instanceof CadDimension) {
					e.opacity = 1;
				} else {
					e.selectable = false;
					e.opacity = 0.3;
				}
			});
			this.dimLineSelecting = index;
		}
	}

	addDimension() {
		this.selectDimLine(-1);
	}

	removeDimension(index: number) {
		this.cad.removeEntity(this.dimensions[index]);
	}
}
