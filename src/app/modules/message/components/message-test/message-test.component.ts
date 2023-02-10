import {Component} from "@angular/core";
import {MessageService} from "@modules/message/services/message.service";
import {MessageData, MessageDataMap} from "../message/message-types";

@Component({
  selector: "app-message-test",
  templateUrl: "./message-test.component.html",
  styleUrls: ["./message-test.component.scss"]
})
export class MessageTestComponent {
  btns: Record<keyof MessageDataMap, MessageData> = {
    alert: {type: "alert", content: "alert"},
    confirm: {type: "confirm", content: "confirm"},
    form: {type: "form", inputs: [{type: "string", label: "label", value: "value"}]},
    book: {type: "book", bookData: [{content: "content"}]},
    editor: {type: "editor", content: "editor"},
    button: {type: "button", buttons: ["button1", "button2"]},
    iframe: {type: "iframe", content: location.href},
    json: {type: "json", json: {a: 1, b: 2}}
  };

  constructor(private message: MessageService) {}

  returnZero() {
    return 0;
  }

  openMessage(key: string, data: MessageData) {
    this.message[key as keyof MessageDataMap](data);
  }
}
