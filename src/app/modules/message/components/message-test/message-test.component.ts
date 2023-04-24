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
    alert: {type: "alert", content: "alert", title: "title"},
    confirm: {type: "confirm", content: "confirm", title: "title"},
    form: {type: "form", inputs: [{type: "string", label: "label", value: "value"}], title: "title"},
    book: {type: "book", bookData: [{content: "content", title: "title2"}], title: "title1"},
    editor: {type: "editor", content: "editor", title: "title"},
    button: {type: "button", buttons: ["button1", "button2"], title: "title"},
    iframe: {type: "iframe", content: location.href, title: "title"},
    json: {type: "json", json: {a: 1, b: 2}, title: "title"}
  };

  constructor(private message: MessageService) {}

  returnZero() {
    return 0;
  }

  openMessage(key: string, data: MessageData) {
    this.message[key as keyof MessageDataMap](data);
  }
}
