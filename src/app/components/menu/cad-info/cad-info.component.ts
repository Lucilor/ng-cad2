import {Component, OnDestroy, OnInit} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {MatSelectChange} from "@angular/material/select";
import {CadBaseLine, CadData, CadJointPoint, CadOption} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadEntity, CadLine} from "@src/app/cad-viewer/cad-data/cad-entities";
import {generatePointsMap} from "@src/app/cad-viewer/cad-data/cad-lines";
import {getCadGongshiText} from "@src/app/cad.utils";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppStatusService, CadStatus} from "@src/app/services/app-status.service";
import {openCadListDialog} from "../../dialogs/cad-list/cad-list.component";
import {openCadOptionsDialog} from "../../dialogs/cad-options/cad-options.component";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends Subscribed() implements OnInit, OnDestroy {
	cadsData: CadData[] = [];
	lengths: string[] = [];
	editDisabled = true;

	onEntityClick = ((_event: MouseEvent, entity?: CadEntity) => {
		const {name, index} = this.status.cadStatus$.getValue();
		const data = this.status.getFlatSelectedCads()[0];
		if (name === "selectBaseline" && typeof index === "number") {
			if (entity instanceof CadLine) {
				const baseLine = data.baseLines[index];
				if (entity.isHorizontal()) {
					baseLine.idY = entity.selected ? entity.originalId : "";
				}
				if (entity.isVertical()) {
					baseLine.idX = entity.selected ? entity.originalId : "";
				}
				data.updateBaseLines();
				data.getAllEntities().forEach((e) => {
					e.selected = [baseLine.idX, baseLine.idY].includes(e.originalId);
				});
				this.status.cad.render();
			}
		}
	}).bind(this);

	constructor(private status: AppStatusService, private dialog: MatDialog, private message: MessageService) {
		super();
	}

	ngOnInit() {
		this.subscribe(this.status.selectedCads$, () => {
			this.cadsData = this.status.getFlatSelectedCads();
			const ids = this.status.cad.data.components.data.map((v) => v.id);
			if (this.cadsData.length === 1 && ids.includes(this.cadsData[0].id)) {
				this.editDisabled = false;
			} else {
				this.editDisabled = true;
				if (this.cadsData.length < 1) {
					this.cadsData = [new CadData()];
				}
			}
			this.updateLengths(this.cadsData);
		});
		this.subscribe(this.status.cadStatus$, (cadStatus) => {
			const {name, index} = cadStatus;
			if (name === "selectJointpoint" && typeof index === "number") {
				this.status.setCadPoints(generatePointsMap(this.cadsData[0].getAllEntities()));
			} else {
				this.status.setCadPoints([]);
			}
		});
		this.subscribe(this.status.cadPoints$, (cadPoints) => {
			const point = cadPoints.filter((v) => v.active)[0];
			const {name} = this.status.cadStatus$.getValue();
			if (name !== "selectJointpoint" || !point) {
				return;
			}
			const jointPoint = this.cadsData[0].jointPoints[this.status.cadStatus$.getValue().index];
			jointPoint.valueX = point.x;
			jointPoint.valueY = point.y;
		});
		this.status.cad.on("entityclick", this.onEntityClick);
	}

	ngOnDestroy() {
		this.status.cad.off("entityclick", this.onEntityClick);
	}

	updateLengths(cadsData: CadData[]) {
		this.lengths = [];
		cadsData.forEach((v) => {
			let length = 0;
			const entities = v.getAllEntities();
			entities.line.forEach((e) => (length += e.length));
			entities.arc.forEach((e) => (length += e.length));
			entities.circle.forEach((e) => (length += e.curve.length));
			this.lengths.push(length.toFixed(2));
		});
	}

	async selectOptions(option: CadOption | string) {
		const data = this.status.getFlatSelectedCads()[0];
		if (option instanceof CadOption) {
			const checkedItems = option.value.split(",");
			const result = await openCadOptionsDialog(this.dialog, {data: {data, name: option.name, checkedItems}});
			if (Array.isArray(result)) {
				option.value = result.join(",");
			}
		} else if (option === "huajian") {
			const checkedItems = data.huajian.split(",");
			const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "花件", checkedItems}});
			if (Array.isArray(result)) {
				data.huajian = result.join(",");
			}
		} else if (option === "bancai") {
			const checkedItems = data.morenkailiaobancai.split(",");
			const result = await openCadOptionsDialog(this.dialog, {data: {data, name: "板材", checkedItems}});
			if (Array.isArray(result)) {
				data.morenkailiaobancai = result.join(",");
			}
		}
	}

	addCondition(data: CadData, index: number) {
		data.conditions.splice(index + 1, 0, "");
	}

	async removeCondition(data: CadData, index: number) {
		if (await this.message.confirm("是否确定删除？")) {
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
		if (await this.message.confirm("是否确定删除？")) {
			const arr = data.options;
			if (arr.length === 1) {
				arr[0] = new CadOption();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	getItemColor(name: CadStatus["name"], index: number) {
		const cadStatus = this.status.cadStatus();
		if (name === cadStatus.name && index === cadStatus.index) {
			return "accent";
		}
		return "primary";
	}

	addBaseLine(data: CadData, index: number) {
		data.baseLines.splice(index + 1, 0, new CadBaseLine());
	}

	async removeBaseLine(data: CadData, index: number) {
		if (await this.message.confirm("是否确定删除？")) {
			const arr = data.baseLines;
			if (arr.length === 1) {
				arr[0] = new CadBaseLine();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	selectBaseLine(index: number) {
		if (this.getItemColor("selectBaseline", index) === "primary") {
			this.status.cadStatus({name: "selectBaseline", index});
		} else {
			this.status.cadStatus({name: "normal"});
		}
	}

	addJointPoint(data: CadData, index: number) {
		data.jointPoints.splice(index + 1, 0, new CadJointPoint());
	}

	async removeJointPoint(data: CadData, index: number) {
		if (await this.message.confirm("是否确定删除？")) {
			const arr = data.jointPoints;
			if (arr.length === 1) {
				arr[0] = new CadJointPoint();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	selectJointPoint(index: number) {
		if (this.getItemColor("selectJointpoint", index) === "primary") {
			this.status.cadStatus({name: "selectJointpoint", index});
		} else {
			this.status.cadStatus({name: "normal"});
		}
	}

	updateCadGongshi(data: CadData) {
		const mtext = data.entities.mtext.find((e) => (e.info.isCadGongshi = true));
		if (mtext) {
			mtext.text = getCadGongshiText(data);
			this.status.cad.render(mtext);
		}
	}

	async selectKailiaomuban(data: CadData) {
		const checkedItems = [new CadData({id: data.kailiaomuban})];
		const result = await openCadListDialog(this.dialog, {data: {selectMode: "single", collection: "kailiaocadmuban", checkedItems}});
		if (result?.length) {
			data.kailiaomuban = result[0].id;
		}
	}

	offset(event: MatSelectChange) {
		const value: CadData["bancaihoudufangxiang"] = event.value;
		const data = this.status.getFlatSelectedCads()[0];
		const cad = this.status.cad;
		data.bancaihoudufangxiang = value;
		let direction = 0;
		if (value === "gt0") {
			direction = 1;
		} else if (value === "lt0") {
			direction = -1;
		} else {
			return;
		}
		const distance = 2;
		const entities = data.getAllEntities().clone(true);
		entities.offset(direction, distance);
		cad.add(entities);

		const blinkInterval = 500;
		const blinkCount = 3;
		const blink = (el: CadEntity["el"]) => {
			if (el) {
				el.css("opacity", 1);
				setTimeout(() => el.css("opacity", 0), blinkInterval);
			}
		};
		entities.forEach((e) => {
			const el = e.el;
			if (el) {
				el.css("transition", blinkInterval + "ms");
				blink(el);
			}
		});
		let count = 1;
		const id = setInterval(() => {
			entities.forEach((e) => blink(e.el));
			if (++count > blinkCount) {
				clearInterval(id);
				cad.remove(entities);
			}
		}, blinkInterval * 2);
	}
}
