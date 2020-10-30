import {MatMenuTrigger} from "@angular/material/menu";
import {Constructor} from "../utils/types";

export const ContextMenu = <T extends Constructor>(base: T = class {} as T) =>
	class extends base {
		contextMenu?: MatMenuTrigger;
		contextMenuPosition = {x: "0px", y: "0px"};

		onContextMenu(event: MouseEvent, ..._args: any[]) {
			event.preventDefault();
			this.contextMenuPosition.x = event.clientX + "px";
			this.contextMenuPosition.y = event.clientY + "px";
			this.contextMenu?.openMenu();
		}
	};
