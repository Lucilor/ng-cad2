import {Component, OnInit, Input} from "@angular/core";
import {MatDialogRef, MatDialog} from "@angular/material/dialog";
import {CadDimensionFormComponent} from "../cad-dimension-form/cad-dimension-form.component";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {State} from "@src/app/store/state";
import {Store} from "@ngrx/store";
import {CadStatusAction} from "@src/app/store/actions";

@Component({
	selector: "app-cad-dimension",
	templateUrl: "./cad-dimension.component.html",
	styleUrls: ["./cad-dimension.component.scss"]
})
export class CadDimensionComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() cadStatus: State["cadStatus"];
	dimNameFocus = -1;
	get data() {
		return this.cad.data.getAllEntities().dimension;
	}

	constructor(private dialog: MatDialog, private store: Store<State>) {}

	ngOnInit() {
		const {cad} = this;
		cad.controls.on("entityselect", (event, entity) => {
			const data = cad.data.components.data;
			const {name, index} = this.cadStatus;
			const dimensions = this.data;
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

	// editDimension(i: number) {
	// 	const {cad, data} = this;
	// 	const ref: MatDialogRef<CadDimensionFormComponent, CadDimension> = this.dialog.open(CadDimensionFormComponent, {
	// 		data: {data: data[i]},
	// 		disableClose: true
	// 	});
	// 	ref.afterClosed().subscribe((dimension) => {
	// 		if (dimension) {
	// 			cad.render();
	// 		}
	// 	});
	// }

	// getDimensionName(dimension: CadDimension, index: number) {
	// 	if (this.dimNameFocus === index) {
	// 		return dimension.mingzi || "";
	// 	} else {
	// 		return `${dimension.mingzi || ""} ${dimension.qujian || ""}`;
	// 	}
	// }

	// setDimensionName(event: InputEvent, dimension: CadDimension) {
	// 	const str = (event.target as HTMLInputElement).value;
	// 	dimension.mingzi = str;
	// 	this.cad.render();
	// }

	// selectDimLine(i: number) {
	// 	const {cad, data} = this;
	// 	if (menu.mode.type === "dimension" && menu.mode.index === i) {
	// 		menu.selectLineEnd();
	// 		menu.mode.index = -1;
	// 	} else {
	// 		const {entity1, entity2} = data[i] || {};
	// 		cad.traverse((o, e) => {
	// 			if (e instanceof CadLine) {
	// 				o.userData.selectable = true;
	// 				o.userData.selected = [entity1?.id, entity2?.id].includes(e.id);
	// 				e.opacity = 1;
	// 			} else if (e instanceof CadDimension) {
	// 				e.opacity = 1;
	// 			} else {
	// 				o.userData.selectable = false;
	// 				e.opacity = 0.3;
	// 			}
	// 		});
	// 		menu.selectLineBegin("dimension", i);
	// 	}
	// }

	// addDimension() {
	// 	this.selectDimLine(-1);
	// }

	// removeDimension(dimension: CadDimension) {
	// 	this.menu.cad.removeEntity(dimension);
	// }
}
