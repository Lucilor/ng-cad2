import {Component, HostListener} from "@angular/core";
import {Constructor, ObjectOf} from "@utils";

export interface IFrameChildConstructor {
  messageType: string;
  actionMap: ObjectOf<{fn: (params: any) => any; action?: string}>;
}

export interface IFrameMessage {
  type: string;
  action: string;
  data: any;
}

export const IFrameChild = <T extends Constructor<IFrameChildConstructor>>(base: T = class {} as T) => {
  @Component({template: ""})
  class IFrameChildComponent extends base {
    @HostListener("window:message", ["$event"])
    async onMessage(event: MessageEvent) {
      const data: IFrameMessage = event.data;
      const messageType = this.messageType;
      if (!data || typeof data !== "object" || data.type !== messageType) {
        return;
      }
      const actionValue = this.actionMap[data.action];
      if (actionValue) {
        let result;
        try {
          result = await actionValue.fn.apply(this, [data.data]);
        } catch (error) {
          console.error(error);
          result = error;
        }
        if (actionValue.action) {
          const resultMessage: IFrameMessage = {
            type: messageType,
            action: actionValue.action,
            data: result
          };
          window.parent.postMessage(resultMessage, "*");
        }
      }
    }

    postMessage(action: string, data?: any) {
      const message: IFrameMessage = {type: this.messageType, action, data};
      window.parent.postMessage(message, "*");
    }
  }
  return IFrameChildComponent;
};
