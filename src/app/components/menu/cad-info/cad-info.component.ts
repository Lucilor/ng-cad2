import {Component, OnInit, Input, OnDestroy} from "@angular/core";
import {MenuComponent} from "../menu.component";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadOptionsComponent} from "../../menu/cad-options/cad-options.component";
import {getCurrCads, getCadStatus} from "@src/app/store/selectors";
import {timeout} from "@src/app/app.common";
import {CadDataService} from "@src/app/services/cad-data.service";
import {MessageComponent} from "../../message/message.component";
import {CadStatusAction} from "@src/app/store/actions";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadPointsComponent} from "../cad-points/cad-points.component";
import {Observable, Subject} from "rxjs";
import {take, takeUntil} from "rxjs/operators";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends MenuComponent implements OnInit, OnDestroy {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	@Input() formulas: string[] = [];
	cadStatus: Observable<State["cadStatus"]>;
	lengths: string[] = [];
	points: CadPointsComponent["points"] = [];
	baseLineIndex = -1;
	destroyed = new Subject();

	constructor(private store: Store<State>, private dialog: MatDialog, private dataService: CadDataService) {
		super();
	}

	ngOnInit() {
		this.cadStatus = this.store.select(getCadStatus);
		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe(({name, index}) => {
			if (name === "select baseline") {
				this.baseLineIndex = index;
			} else {
				this.baseLineIndex = -1;
			}
		});
		this.store
			.select(getCurrCads)
			.pipe(takeUntil(this.destroyed))
			.subscribe(async () => {
				await timeout(0);
				this.updateLengths();
			});
		this.cad.controls.on("entityclick", async (event, entity, object) => {
			const data = this.currCads[0];
			const {name, index} = await this.cadStatus.pipe(take(1)).toPromise();
			if (name === "select baseline") {
				if (entity instanceof CadLine) {
					const baseLine = data.baseLines[index];
					if (entity.isHorizonal()) {
						baseLine.idY = object.userData.selected ? entity.originalId : "";
					}
					if (entity.isVertical()) {
						baseLine.idX = object.userData.selected ? entity.originalId : "";
					}
					data.updateBaseLines();
					data.getAllEntities().forEach((e) => {
						const object = this.cad.objects[e.id];
						if (object) {
							object.userData.selected = [baseLine.idX, baseLine.idY].includes(e.originalId);
						}
					});
					this.cad.render();
				}
			}
		});
	}

	ngOnDestroy() {
		this.destroyed.next();
	}

	updateLengths() {
		this.currCads.forEach((v, i) => {
			let length = 0;
			const entities = v.getAllEntities();
			entities.line.forEach((e) => (length += e.length));
			entities.arc.forEach((e) => (length += e.curve.getLength()));
			entities.circle.forEach((e) => (length += e.curve.getLength()));
			this.lengths[i] = length.toFixed(2);
		});
	}

	selectOptions(option: CadOption | string) {
		const data = this.currCads[0];
		if (option instanceof CadOption) {
			const checkedItems = option.value.split(",");
			const ref: MatDialogRef<CadOptionsComponent, string[]> = this.dialog.open(CadOptionsComponent, {
				data: {data, name: option.name, checkedItems}
			});
			ref.afterClosed().subscribe((v) => {
				if (Array.isArray(v)) {
					option.value = v.join(",");
				}
			});
		} else if (option === "huajian") {
			const checkedItems = data.huajian.split(",");
			const ref: MatDialogRef<CadOptionsComponent, string[]> = this.dialog.open(CadOptionsComponent, {
				data: {data, name: "花件", checkedItems}
			});
			ref.afterClosed().subscribe((v) => {
				if (Array.isArray(v)) {
					data.huajian = v.join(",");
				}
			});
		}
	}

	confirmRemove() {
		const ref = this.dialog.open(MessageComponent, {data: {content: "是否确定删除？", confirm: true}});
		return new Promise((r) => {
			ref.afterClosed().subscribe((res) => {
				r(res);
			});
		});
	}

	addCondition(data: CadData, index: number) {
		data.conditions.splice(index + 1, 0, "");
	}

	async removeCondition(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.conditions;
			if (arr.length === 1) {
				arr[0] = "";
			} else {
				arr.splice(index, 1);
			}
		}
	}

	addOption(data: CadData, index: number) {
		data.options.splice(index + 1, 0, new CadOption());
	}

	async removeOption(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.options;
			if (arr.length === 1) {
				arr[0] = new CadOption();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	addBaseLine(data: CadData, index: number) {
		data.baseLines.splice(index + 1, 0, new CadBaseLine());
	}

	async removeBaseLine(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.baseLines;
			if (arr.length === 1) {
				arr[0] = new CadBaseLine();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	async selectBaseLine(data: CadData, index: number) {
		const {cad, store} = this;
		if ((await this.getItemColor(index)) === "primary") {
			const {idX, idY} = data.baseLines[index];
			if (cad.objects[idX]) {
				cad.objects[idX].userData.selected = true;
			}
			if (cad.objects[idY]) {
				cad.objects[idY].userData.selected = true;
			}
			cad.traverse((o, e) => {
				e.opacity = 0.3;
				o.userData.selectable = false;
			});
			this.currCads.forEach((v) => {
				cad.traverse((o, e) => {
					if (e instanceof CadLine) {
						if (e.isHorizonal() || e.isVertical()) {
							e.opacity = 1;
							o.userData.selectable = true;
						}
					}
				}, v.getAllEntities());
			});
			cad.controls.config.selectMode = "single";
			store.dispatch<CadStatusAction>({type: "set cad status", name: "select baseline", index});
		} else {
			store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		}
	}

	addJointPoint(data: CadData, index: number) {
		data.jointPoints.splice(index + 1, 0, new CadJointPoint());
	}

	async removeJointPoint(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.jointPoints;
			if (arr.length === 1) {
				arr[0] = new CadJointPoint();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	getItemColor(index: number) {
		if (index === this.baseLineIndex) {
			return "accent";
		}
		return "primary";
	}

	saveStatus() {}

	loadStatus() {}
}
