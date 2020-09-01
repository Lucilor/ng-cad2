import {Point, Rectangle} from "../utils";
import {CadEntities} from "./cad-data/cad-entities";
import {CadEntity} from "./cad-data/cad-entity";
import {CadViewer} from "./cad-viewer";

export interface CadEvents {
	pointerdown: [PointerEvent, never];
	pointermove: [PointerEvent, never];
	pointerup: [PointerEvent, never];
	click: [PointerEvent, never];
	wheel: [WheelEvent, never];
	keydown: [KeyboardEvent, never];
	entityclick: [PointerEvent, CadEntity];
	entitiesselect: [null, CadEntities];
	entitiesunselect: [null, CadEntities];
	entitiesremove: [null, CadEntities];
	entitiesadd: [null, CadEntities];
	// move = "move",
	// scale = "scale"
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
	const {clientX, clientY, button} = event;
	const point = new Point(clientX, clientY);
	this.status.pointer = {from: point, to: point.clone()};
	this.status.button = button;
	this.emit("pointerdown", event);
}

function onPointerMove(this: CadViewer, event: PointerEvent) {
	const {clientX, clientY, shiftKey} = event;
	const {status} = this;
	const {pointer, button} = this.status;
	if (pointer) {
		const {from, to} = pointer;
		if ((button === 0 && shiftKey) || button === 1) {
			const offset = new Point(clientX, clientY).sub(to).divide(this.zoom());
			if (!this.config.dragAxis.includes("x")) {
				offset.x = 0;
			}
			if (!this.config.dragAxis.includes("y")) {
				offset.y = 0;
			}
			this.move(offset.x, offset.y);
		} else if (button === 0) {
			const triggerMultiple = this.config.selectMode === "multiple";
			if (triggerMultiple) {
				if (!status.multiSelector) {
					status.multiSelector = document.createElement("div");
					status.multiSelector.classList.add("multi-selector");
					this.dom.appendChild(status.multiSelector);
				}
				const multiSelector = status.multiSelector;
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
	const status = this.status;
	if (status.pointer) {
		const {from, to} = status.pointer;
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
	this.status.multiSelector?.remove();
	this.status = {pointer: null, button: -1, multiSelector: null};
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

export const controls = {onWheel, onClick, onPointerDown, onPointerMove, onPointerUp, onKeyDown, onEntityClick};
