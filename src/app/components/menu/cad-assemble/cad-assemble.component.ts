import {Component, OnInit, OnDestroy, Injector, Output, EventEmitter} from "@angular/core";
import {CadConnection, CadData} from "@app/cad-viewer/cad-data/cad-data";
import {CadEntity} from "@src/app/cad-viewer/cad-data/cad-entities";
import {Subscribed} from "@src/app/mixins/Subscribed.mixin";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfigService} from "@src/app/services/app-config.service";
import {AppStatusService, SelectedCads, SelectedCadType} from "@src/app/services/app-status.service";

@Component({
	selector: "app-cad-assemble",
	templateUrl: "./cad-assemble.component.html",
	styleUrls: ["./cad-assemble.component.scss"]
})
export class CadAssembleComponent extends Subscribed() implements OnInit, OnDestroy {
	@Output() selectComponent = new EventEmitter<string>();
	options = {space: "0", position: "absolute"};
	ids: string[] = [];
	names: string[] = [];
	lines: string[] = [];
	data = new CadData();
	private prevSelectedCads: SelectedCads | null = null;
	private prevDisabledCadTypes: SelectedCadType[] | null = null;

	get connections() {
		return this.data.components.connections;
	}

	private onEntityClick = ((_event: MouseEvent, entity?: CadEntity) => {
		const name = this.status.cadStatus("name");
		if (name !== "assemble" || !entity) {
			return;
		}
		const cad = this.status.cad;
		const data = this.data;
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
							const found2 = cad.data.findEntity(lines[prev]);
							if (found2) {
								found2.selected = false;
							}
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
						lines.forEach((l) => {
							const e = data.findEntity(l);
							if (e) {
								e.selected = true;
							}
						});
					}
					if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
						try {
							data.assembleComponents(new CadConnection({ids, names, lines, space, position}));
						} catch (error) {
							this.message.alert(error.message);
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

	private onEntitiesSelect = (() => {
		const {name, index} = this.status.cadStatus();
		if (name !== "assemble") {
			return;
		}
		const cad = this.status.cad;
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

	constructor(private status: AppStatusService, private message: MessageService) {
		super();
	}

	ngOnInit() {
		this.subscribe(this.status.selectedCads$, (selectedCads) => {
			const data = this.status.cad.data.findChild(selectedCads.cads[0]);
			if (data) {
				this.data = data;
			}
		});
		this.subscribe(this.status.cadStatus$, (cadStatus) => {
			const {name, index} = cadStatus;
			const data = this.status.cad.data.components.data[index];
			if (name === "assemble") {
				if (!this.prevDisabledCadTypes) {
					this.prevDisabledCadTypes = this.status.disabledCadTypes$.getValue();
					this.status.disabledCadTypes$.next(["cads", "partners"]);
				}
				if (!this.prevSelectedCads) {
					this.prevSelectedCads = this.status.selectedCads$.getValue();
					this.status.selectedCads$.next({cads: [data.id], partners: [], components: [], fullCads: [data.id]});
				}
			} else {
				if (this.prevDisabledCadTypes) {
					this.status.disabledCadTypes$.next(this.prevDisabledCadTypes);
					this.prevDisabledCadTypes = null;
				}
				if (this.prevSelectedCads) {
					this.status.selectedCads$.next(this.prevSelectedCads);
					this.prevSelectedCads = null;
				}
			}
		});

		const cad = this.status.cad;
		cad.on("entityclick", this.onEntityClick);
		cad.on("entitiesselect", this.onEntitiesSelect);
	}

	ngOnDestroy() {
		super.ngOnDestroy();
		const cad = this.status.cad;
		cad.off("entityclick", this.onEntityClick);
		cad.off("entitiesselect", this.onEntitiesSelect);
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
				this.message.alert(error);
			}
		});
		this.status.cad.render();
	}
}
