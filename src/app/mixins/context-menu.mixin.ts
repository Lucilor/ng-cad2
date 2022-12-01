import {MatMenuTrigger} from "@angular/material/menu";
import {Constructor} from "@utils";

// TODO: make it a module
export const ContextMenu = <T extends Constructor>(base: T = class {} as T) =>
  class extends base {
    contextMenu!: MatMenuTrigger;
    contextMenuPosition = {x: "0px", y: "0px"};

    onContextMenu(event: MouseEvent, ...args: any[]) {
      event.preventDefault();
      const placeholder = args[0];
      let dx = 0;
      let dy = 0;
      if (placeholder instanceof HTMLElement) {
        const parent = placeholder.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          dx -= rect.left;
          dy -= rect.top;
        }
      }
      this.contextMenuPosition.x = event.clientX + dx + "px";
      this.contextMenuPosition.y = event.clientY + dy + "px";
      this.contextMenu.openMenu();
    }
  };
