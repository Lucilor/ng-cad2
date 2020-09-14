import {Component, OnInit, OnDestroy, Injector, Output, EventEmitter} from "@angular/core";
import {MenuComponent} from "../menu.component";
import {CadConnection, CadData} from "@app/cad-viewer/cad-data/cad-data";
import {CadEntity} from "@app/cad-viewer/cad-data/cad-entity";
import {openMessageDialog} from "../../message/message.component";
import {getCadStatus, getCurrCads} from "@app/store/selectors";

@Component({
	selector: "app-cad-assemble",
	templateUrl: "./cad-assemble.component.html",
	styleUrls: ["./cad-assemble.component.scss"]
})
export class CadAssembleComponent extends MenuComponent implements OnInit, OnDestroy {
	@Output() selectComponent = new EventEmitter<string>();
	options = {space: "0", position: "absolute"};
	ids: string[] = [];
	names: string[] = [];
	lines: string[] = [];
	data = new CadData();

	get connections() {
		return this.data.components.connections;
	}

	onEntityClick = (async (_event: PointerEvent, entity: CadEntity) => {
		const {name} = await this.getObservableOnce(getCadStatus);
		if (name !== "assemble") {
			return;
		}
		const {cad, data} = this;
		const dumpComponent = new CadData({id: data.id, name: data.name});
		dumpComponent.entities = data.entities;
		data.partners.forEach((v) => {
			dumpComponent.entities.merge(v.getAllEntities());
		});
		for (const component of [...data.components.data, dumpComponent]) {
			const {ids, lines, names} = this;
			const found = component.findEntity(entity.id);
			if (found) {
				const prev = ids.findIndex((id) => id === component.id);
				const {space, position} = this.options;
				if (entity.selected) {
					if (position === "absolute") {
						if (prev > -1) {
							cad.data.findEntity(lines[prev]).selected = false;
							lines[prev] = found.originalId;
						} else {
							ids.push(component.id);
							names.push(component.name);
							lines.push(found.originalId);
						}
					}
					if (position === "relative") {
						if (prev > -1) {
							if (prev === 0) {
								lines.push(found.originalId);
								if (lines.length > 2) {
									lines.shift();
								}
							} else {
								lines[prev] = found.originalId;
							}
						} else {
							ids.push(component.id);
							names.push(component.name);
							lines.push(found.originalId);
						}
						lines.forEach((l) => (data.findEntity(l).selected = true));
					}
					if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
						try {
							data.assembleComponents(new CadConnection({ids, names, lines, space, position}));
						} catch (error) {
							openMessageDialog(this.dialog, {data: {type: "alert", content: error.message}});
						} finally {
							ids.length = 0;
							names.length = 0;
							lines.length = 0;
							cad.unselectAll();
						}
					}
				} else if (prev > -1) {
					if (position === "relative") {
						if (prev === 0) {
							const idx = lines.findIndex((l) => l === found.id);
							lines.splice(idx, -1);
							if (lines.length < 1) {
								ids.splice(prev, 1);
							}
						} else {
							ids.splice(prev, 1);
							lines.splice(prev + 1, 1);
						}
					} else {
						ids.splice(prev, 1);
						lines.splice(prev, 1);
					}
				}
				cad.render();
				break;
			}
		}
	}).bind(this);

	onEntitiesSelect = (async () => {
		const {name, index} = await this.getObservableOnce(getCadStatus);
		if (name !== "assemble") {
			return;
		}
		const cad = this.cad;
		const data = cad.data.components.data[index];
		const selected = cad
			.selected()
			.toArray()
			.map((e) => e.id);
		data.components.data.forEach((v) => {
			const entities = v.getAllEntities().toArray();
			for (const e of entities) {
				if (selected.includes(e.id)) {
					this.selectComponent.emit(v.id);
					break;
				}
			}
		});
	}).bind(this);

	constructor(injector: Injector) {
		super(injector);
	}

	ngOnInit() {
		super.ngOnInit();
		this.cad.on("entityclick", this.onEntityClick);
		this.cad.on("entitiesselect", this.onEntitiesSelect);
		this.getObservable(getCurrCads).subscribe(({cads}) => {
			const data = this.cad.data.findChild(cads[0]);
			if (data) {
				this.data = data;
			}
		});
	}

	ngOnDestroy() {
		super.ngOnInit();
		this.cad.off("entityclick", this.onEntityClick);
		this.cad.off("entitiesselect", this.onEntitiesSelect);
	}

	clearConnections() {
		this.connections.length = 0;
	}

	removeConnection(index: number) {
		this.connections.splice(index, 1);
	}

	directAssemble() {
		const data = this.data;
		data.components.data.forEach((v) => {
			try {
				data.directAssemble(v);
			} catch (error) {
				openMessageDialog(this.dialog, {data: {type: "alert", content: error}});
			}
		});
		this.cad.render();
	}

	saveStatus() {}

	loadStatus() {}
}
