import {Component, ElementRef, HostListener, Inject, OnInit, QueryList, ViewChild, ViewChildren} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DomSanitizer, SafeHtml, SafeResourceUrl} from "@angular/platform-browser";
import {Debounce} from "@decorators/debounce";
import {ObjectOf, timeout} from "@lucilor/utils";
import {JsonEditorComponent, JsonEditorOptions} from "@maaxgr/ang-jsoneditor";
import {InputComponent} from "@modules/input/components/input.component";
import {InputInfo} from "@modules/input/components/input.types";
import {MessageService} from "@modules/message/services/message.service";
import {clamp, cloneDeep} from "lodash";
import {QuillEditorComponent, QuillViewComponent} from "ngx-quill";
import {ButtonMessageData, MessageData, MessageDataMap, MessageOutput} from "./message-types";

@Component({
  selector: "app-message",
  templateUrl: "./message.component.html",
  styleUrls: ["./message.component.scss"]
})
export class MessageComponent implements OnInit {
  titleHTML: SafeHtml = "";
  subTitleHTML: SafeHtml = "";
  contentHTML: SafeHtml = "";
  iframeSrc: SafeResourceUrl = "";
  page = 0;
  jsonEditorOptions = new JsonEditorOptions();
  inputsBackup: InputInfo[] = [];
  @ViewChild(QuillEditorComponent) editor?: QuillViewComponent;
  @ViewChild("iframe") iframe?: ElementRef<HTMLIFrameElement>;
  @ViewChildren("formInput") formInputs?: QueryList<InputComponent>;
  @ViewChild(JsonEditorComponent, {static: false}) jsonEditor?: JsonEditorComponent;

  private get _editorToolbarHeight() {
    if (this.editor) {
      const el = this.editor.elementRef.nativeElement as HTMLElement;
      const toolbar = el.querySelector(".ql-toolbar");
      if (toolbar) {
        return toolbar.getBoundingClientRect().height;
      }
    }
    return 0;
  }

  get inputs() {
    if (this.data.type === "form") {
      return this.data.inputs;
    }
    return [];
  }

  get buttons() {
    if (this.data.type === "button") {
      return this.data.buttons;
    }
    return [];
  }

  get minPage() {
    return 0;
  }
  get maxPage() {
    if (this.data.type === "book") {
      return this.data.bookData.length - 1;
    }
    return 0;
  }

  get titleClass() {
    return this.data.titleClass || "";
  }
  get contentClass() {
    return this.data.contentClass || "";
  }

  constructor(
    public dialogRef: MatDialogRef<MessageComponent, MessageOutput>,
    private sanitizer: DomSanitizer,
    private message: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: MessageData
  ) {
    this.data = cloneDeep(this.data);
  }

  ngOnInit() {
    const data = this.data;
    if (data.title) {
      this.titleHTML = this.sanitizer.bypassSecurityTrustHtml(data.title);
    } else {
      this.titleHTML = "";
    }
    if (data.content === null || data.content === undefined) {
      data.content = "";
    } else if (data.content instanceof HTMLElement) {
      data.content = data.content.outerHTML;
    } else if (typeof data.content !== "string") {
      try {
        data.content = JSON.stringify(data.content);
      } catch (error) {
        console.warn(error);
      }
    }
    this.contentHTML = this.sanitizer.bypassSecurityTrustHtml(data.content);

    if (data.type === "form") {
      if (data.inputs.length > 0 && !data.inputs.some((v) => v.autoFocus)) {
        data.inputs[0].autoFocus = true;
      }
    } else if (data.type === "book") {
      this.setPage(0);
    } else if (data.type === "iframe") {
      this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(data.content);
    } else if (data.type === "json") {
      this.jsonEditorOptions = new JsonEditorOptions();
      this.jsonEditorOptions.modes = ["code", "text", "tree", "view"];
      this.jsonEditorOptions.mode = "code";
      Object.assign(this.jsonEditorOptions, data.options);
    }

    const id = window.setInterval(() => {
      if (this.resizeEditor()) {
        window.clearInterval(id);
      }
    }, 600);

    this.inputsBackup = cloneDeep(this.inputs);
  }

  @HostListener("window:resize")
  @Debounce(500)
  resizeEditor() {
    if (this.editor) {
      const el = this.editor.editorElem;
      const height = this._editorToolbarHeight;
      if (height) {
        el.style.height = `calc(100% - ${height}px)`;
        return true;
      }
    }
    return false;
  }

  async submit(button?: ButtonMessageData["buttons"][number]) {
    const type = this.data.type;
    if (type === "confirm") {
      this.dialogRef.close(true);
    } else if (type === "form") {
      const values: ObjectOf<string> = {};
      const inputs = this.formInputs?.toArray() || [];
      let hasError = false;
      for (const input of inputs) {
        if (input.onChangeDelay) {
          await timeout(input.onChangeDelayTime);
        }
        const error = input.validateValue();
        if (error) {
          hasError = true;
        }
        const key = input.info.name || input.info.label;
        values[key] = input.value;
      }
      if (!hasError) {
        this.dialogRef.close(values);
      }
    } else if (type === "editor") {
      this.dialogRef.close(this.data.content);
    } else if (type === "button" && button) {
      this.dialogRef.close(typeof button === "string" ? button : button.label);
    } else if (type === "json" && this.jsonEditor) {
      const editor = this.jsonEditor;
      try {
        this.dialogRef.close(editor.get());
      } catch (error) {
        this.message.error("数据格式错误，请改正后再确定");
      }
    } else {
      this.dialogRef.close(null);
    }
  }

  cancel() {
    const type = this.data.type;
    if (type === "confirm") {
      this.dialogRef.close(false);
    } else if (type === "button") {
      this.dialogRef.close(this.data.btnTexts?.cancel);
    } else {
      this.dialogRef.close();
    }
  }

  reset() {
    switch (this.data.type) {
      case "form":
        this.data.inputs = cloneDeep(this.inputsBackup);
        break;
      case "json":
        this.jsonEditor?.set(this.data.defaultJson || null);
        break;
      default:
        break;
    }
  }

  setPage(page: number) {
    if (this.data.type !== "book") {
      return;
    }
    if (this.data.bookData) {
      this.page = clamp(page, this.minPage, this.maxPage);
      const data = this.data.bookData[this.page];
      this.contentHTML = this.sanitizer.bypassSecurityTrustHtml(data.content);
      if (data.title) {
        this.subTitleHTML = this.sanitizer.bypassSecurityTrustHtml(data.title);
      } else {
        this.subTitleHTML = "";
      }
    } else {
      this.page = 0;
    }
  }

  cast<T extends MessageData["type"]>(type: T, data: MessageData) {
    return data as MessageDataMap[T];
  }

  getButtonLabel(button: ButtonMessageData["buttons"][0]) {
    return typeof button === "string" ? button : button.label;
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      this.formInputs?.forEach((v) => v.validateValue());
      this.submit();
    }
  }
}
