import {Component, OnInit, Input, OnDestroy, Injector} from "@angular/core";
import {MenuComponent} from "../menu.component";
import {State} from "@src/app/store/state";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialogRef} from "@angular/material/dialog";
import {CadOptionsComponent} from "../../menu/cad-options/cad-options.component";
import {getCurrCadsData} from "@src/app/store/selectors";
import {MessageComponent} from "../../message/message.component";
import {CadStatusAction, CadPointsAction} from "@src/app/store/actions";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {takeUntil} from "rxjs/operators";
import {generatePointsMap} from "@src/app/cad-viewer/cad-data/cad-lines";
import {getCadGongshiText} from "@src/app/app.common";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends MenuComponent implements OnInit, OnDestroy {
	@Input() formulas: string[] = [];
	cadsData: CadData[];
	lengths: string[] = [];
	baseLineIndex = -1;
	jointPointIndex = -1;

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.currCads.pipe(takeUntil(this.destroyed)).subscribe((currCads) => {
			this.cadsData = getCurrCadsData(this.cad.data, currCads);
			this.updateLengths(this.cadsData);
		});
		this.cadStatus.pipe(takeUntil(this.destroyed)).subscribe(({name}) => {
			if (name === "normal") {
				this.baseLineIndex = -1;
				this.jointPointIndex = -1;
			}
		});
		this.cad.controls.on("entityclick", async (event, entity) => {
			const {name, index} = await this.getCadStatus();
			const data = (await this.getCurrCadsData())[0];
			if (name === "select baseline") {
				if (entity instanceof CadLine) {
					const baseLine = data.baseLines[index];
					if (entity.isHorizonal()) {
						baseLine.idY = entity.selected ? entity.originalId : "";
					}
					if (entity.isVertical()) {
						baseLine.idX = entity.selected ? entity.originalId : "";
					}
					data.updateBaseLines();
					data.getAllEntities().forEach((e) => {
						e.selected = [baseLine.idX, baseLine.idY].includes(e.originalId);
					});
					this.cad.render();
				}
			}
		});
	}

	ngOnDestroy() {
		super.ngOnDestroy();
	}

	updateLengths(cadsData: CadData[]) {
		this.lengths = [];
		cadsData.forEach((v) => {
			let length = 0;
			const entities = v.getAllEntities();
			entities.line.forEach((e) => (length += e.length));
			entities.arc.forEach((e) => (length += e.curve.getLength()));
			entities.circle.forEach((e) => (length += e.curve.getLength()));
			this.lengths.push(length.toFixed(2));
		});
	}

	async selectOptions(option: CadOption | string) {
		const data = (await this.getCurrCadsData())[0];
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

	async confirmRemove() {
		const ref = this.dialog.open(MessageComponent, {data: {content: "是否确定删除？", type: "confirm"}});
		return ref.afterClosed().toPromise();
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

	selectBaseLine(data: CadData, index: number) {
		const {cad, store} = this;
		if (this.getItemColor(index, "baseLine") === "primary") {
			const {idX, idY} = data.baseLines[index];
			const entityX = cad.data.findEntity(idX);
			const entityY = cad.data.findEntity(idY);
			if (entityX) {
				entityX.selected = true;
			}
			if (entityY) {
				entityY.selected = true;
			}
			cad.traverse((e) => {
				e.opacity = 0.3;
				e.selectable = false;
			});
			this.cadsData.forEach((v) => {
				cad.traverse((e) => {
					if (e instanceof CadLine) {
						if (e.isHorizonal() || e.isVertical()) {
							e.opacity = 1;
							e.selectable = true;
						}
					}
				}, v.getAllEntities());
			});
			cad.controls.config.selectMode = "single";
			store.dispatch<CadStatusAction>({type: "set cad status", name: "select baseline", index});
			this.baseLineIndex = index;
		} else {
			this.baseLineIndex = -1;
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

	selectJointPoint(index: number) {
		const {cad, store} = this;
		if (this.getItemColor(index, "jointPoint") === "primary") {
			this.jointPointIndex = index;
			const map = generatePointsMap(this.cadsData[0].getAllEntities());
			const points: State["cadPoints"] = map.map((v) => {
				const {x, y} = cad.getScreenPoint(v.point);
				return {x, y, active: false};
			});
			store.dispatch<CadPointsAction>({type: "set cad points", points});
			store.dispatch<CadStatusAction>({type: "set cad status", name: "select jointpoint", index});
		} else {
			this.jointPointIndex = -1;
			store.dispatch<CadPointsAction>({type: "set cad points", points: []});
			store.dispatch<CadStatusAction>({type: "set cad status", name: "normal"});
		}
	}

	getItemColor(index: number, type: "baseLine" | "jointPoint") {
		if (type === "baseLine" && index === this.baseLineIndex) {
			return "accent";
		}
		if (type === "jointPoint" && index === this.jointPointIndex) {
			return "accent";
		}
		return "primary";
	}

	updateCadGongshi(data: CadData) {
		const mtext = data.entities.mtext.find((e) => (e.info.isCadGongshi = true));
		mtext.text = getCadGongshiText(data);
		this.cad.render(false, new CadEntities().add(mtext));
	}

	saveStatus() {}

	loadStatus() {}
}
