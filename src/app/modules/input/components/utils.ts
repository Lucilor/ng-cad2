import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf} from "@utils";
import {InputComponent} from "./input.component";

export const getInputValues = (inputs: InputComponent[], message: MessageService) => {
  const values: ObjectOf<any> = {};
  for (const input of inputs) {
    const errorMsg = input.errorMsg;
    if (errorMsg) {
      message.error(errorMsg);
      return null;
    }
    const key = input.info.name || input.info.label;
    values[key] = input.value;
  }
  return values;
};
