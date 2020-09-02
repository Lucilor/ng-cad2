import {Point, Rectangle} from "../utils";
import {CadEntities} from "./cad-data/cad-entities";
import {CadEntity} from "./cad-data/cad-entity";
import {CadViewer} from "./cad-viewer";

let pointer: {from: Point; to: Point} = null;
let button: number = null;
let multiSelector: HTMLDivElement = null;
let entitiesToDrag: CadEntities = null;
let entitiesNotToDrag: CadEntities = null;

export interface CadEvents {
	pointerdown: [PointerEvent, never];
	pointermove: [PointerEvent, never];
	pointerup: [PointerEvent, never];
	click: [PointerEvent, never];
	wheel: [WheelEvent, never];
	keydown: [KeyboardEvent, never];
	entityclick: [PointerEvent, CadEntity];
	entitypointerdown: [PointerEvent, CadEntity];
	entitypointermove: [PointerEvent, CadEntity];
	entitypointerup: [PointerEvent, CadEntity];
	entitiesselect: [null, CadEntities];
	entitiesunselect: [null, CadEntities];
	entitiesremove: [null, CadEntities];
	entitiesadd: [null, CadEntities];
}

function onWheel(this: CadViewer, event: WheelEvent) {
	const step = 0.1;
	const {deltaY, clientX, clientY} = event;
	const {x, y} = this.getWorldPoint(clientX, clientY);
	const zoom = this.zoom();
	if (deltaY > 0) {
		this.zoom(zoom * (1 - step), [x, y]);
	} else if (deltaY < 0) {
		this.zoom(zoom * (1 + step), [x, y]);
	}
}

function onClick(this: CadViewer, event: PointerEvent) {
	// const {clientX, clientY} = event;
	// console.log(clientY, screenY);
	// console.log(this.getPointInView(clientX, clientY));
	this.emit("click", event);
}

function onPointerDown(this: CadViewer, event: PointerEvent) {
	const {clientX, clientY, button: eBtn} = event;
	const point = new Point(clientX, clientY);
	pointer = {from: point, to: point.clone()};
	button = eBtn;
	this.emit("pointerdown", event);
}

function onPointerMove(this: CadViewer, event: PointerEvent) {
	if (pointer) {
		const {clientX, clientY, shiftKey} = event;
		const {selectMode, entityDraggable} = this.config;
		const {from, to} = pointer;
		const translate = new Point(clientX, clientY).sub(to).divide(this.zoom());
		if ((button === 0 && shiftKey) || button === 1) {
			if (!this.config.dragAxis.includes("x")) {
				translate.x = 0;
			}
			if (!this.config.dragAxis.includes("y")) {
				translate.y = 0;
			}
			this.move(translate.x, -translate.y);
		} else if (button === 0) {
			if (entitiesToDrag && entityDraggable) {
				this.moveEntities(entitiesToDrag, entitiesNotToDrag, translate.x, -translate.y);
			} else if (selectMode === "multiple") {
				if (!multiSelector) {
					multiSelector = document.createElement("div");
					multiSelector.classList.add("multi-selector");
					this.dom.appendChild(multiSelector);
				}
				multiSelector.style.left = Math.min(from.x, to.x) + "px";
				multiSelector.style.top = Math.min(from.y, to.y) + "px";
				multiSelector.style.width = Math.abs(from.x - to.x) + "px";
				multiSelector.style.height = Math.abs(from.y - to.y) + "px";
			}
		}
		to.set(clientX, clientY);
	}
	this.emit("pointermove", event);
}

function onPointerUp(this: CadViewer, event: PointerEvent) {
	if (pointer) {
		const {from, to} = pointer;
		const rect = new Rectangle(from, to).justify();
		const toSelect = Array<CadEntity>();
		this.data.getAllEntities().forEach((e) => {
			const domRect = e.el?.node.getBoundingClientRect();
			if (!domRect) {
				return;
			}
			const {top, right, bottom, left} = domRect;
			const rect2 = new Rectangle(new Point(left, top), new Point(right, bottom));
			if (rect.contains(rect2)) {
				toSelect.push(e);
			}
		});
		if (toSelect.every((e) => e.selected)) {
			toSelect.forEach((e) => (e.selected = false));
		} else {
			toSelect.forEach((e) => (e.selected = true));
		}
	}
	pointer = null;
	button = null;
	multiSelector?.remove();
	multiSelector = null;
	if (entitiesToDrag && entitiesNotToDrag) {
		if (entitiesToDrag.length <= entitiesNotToDrag.length) {
			this.render(false, entitiesToDrag);
		} else {
			this.render(false, entitiesNotToDrag);
		}
	}
	entitiesToDrag = entitiesNotToDrag = null;
	this.emit("pointerup", event);
}

function onKeyDown(this: CadViewer, event: KeyboardEvent) {
	const {key, ctrlKey} = event;
	event.preventDefault();
	if (key === "Escape") {
		this.unselectAll();
	} else if (ctrlKey && key === "a") {
		this.selectAll();
	} else if (key === "Delete") {
		this.remove(this.selected());
	}
	this.emit("keydown", event);
}

function onEntityClick(this: CadViewer, event: PointerEvent, entity: CadEntity) {
	event.stopImmediatePropagation();
	if (entity.selected) {
		this.unselect(entity);
	} else {
		this.select(entity);
	}
	this.emit("entityclick", event, entity);
}

function onEntityPointerDown(this: CadViewer, event: PointerEvent, entity: CadEntity) {
	if (this.config.entityDraggable) {
		entitiesToDrag = this.selected();
		entitiesNotToDrag = this.unselected();
	}
	this.emit("entitypointerdown", event, entity);
}

function onEntityPointerMove(this: CadViewer, event: PointerEvent, entity: CadEntity) {
	this.emit("entitypointermove", event, entity);
}

function onEntityPointerUp(this: CadViewer, event: PointerEvent, entity: CadEntity) {
	this.emit("entitypointerup", event, entity);
}

export const controls = {
	onWheel,
	onClick,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	onKeyDown,
	onEntityClick,
	onEntityPointerDown,
	onEntityPointerMove,
	onEntityPointerUp
};
