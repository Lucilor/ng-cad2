import {AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild} from "@angular/core";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {Point} from "@utils";
import {clamp} from "lodash";

export interface AnchorEvent {
  anchor: [number, number];
}

@Component({
  selector: "app-anchor-selector",
  templateUrl: "./anchor-selector.component.html",
  styleUrls: ["./anchor-selector.component.scss"]
})
export class AnchorSelectorComponent implements AfterViewInit {
  @Input() x = 0;
  @Input() y = 0;
  @Input() pointerSize = 10;
  @Input() backgroundSize = 100;
  @Output() anchorChange = new EventEmitter<AnchorEvent>();
  @Output() anchorChangeEnd = new EventEmitter<AnchorEvent>();
  @ViewChild("pointer", {read: ElementRef}) pointer?: ElementRef<HTMLDivElement>;
  @ViewChild("background", {read: ElementRef}) background?: ElementRef<HTMLDivElement>;

  dragging = false;
  pointerPosition: Point | null = null;

  get left() {
    return this.x * this.backgroundSize + "px";
  }
  get top() {
    return this.y * this.backgroundSize + "px";
  }

  constructor() {}

  ngAfterViewInit() {
    this.x = clamp(this.x, 0, 1);
    this.y = clamp(this.y, 0, 1);
  }

  @HostListener("window:pointerdown", ["$event"])
  onDragStarted(event: PointerEvent) {
    if (event.target === this.pointer?.nativeElement) {
      this.dragging = true;
    }
  }

  @HostListener("window:pointermove", ["$event"])
  onDragMoved(event: PointerEvent) {
    if (this.dragging && this.background) {
      const {clientX, clientY} = event;
      const rect = this.background.nativeElement.getBoundingClientRect();
      const backgroundSize = this.backgroundSize;
      const x = clamp(clientX - rect.x, 0, backgroundSize);
      const y = clamp(clientY - rect.y, 0, backgroundSize);
      this.x = Number((x / backgroundSize).toFixed(2));
      this.y = Number((y / backgroundSize).toFixed(2));
      this.anchorChange.emit({anchor: [this.x, this.y]});
    }
  }

  @HostListener("window:pointerup")
  @HostListener("window:pointerleave")
  onDragEnded() {
    if (this.dragging) {
      this.anchorChangeEnd.emit({anchor: [this.x, this.y]});
      this.dragging = false;
    }
  }

  onInputChange(event: Event | MatAutocompleteSelectedEvent, axis: "x" | "y") {
    let value: number;
    if (event instanceof MatAutocompleteSelectedEvent) {
      value = Number(event.option.value);
    } else {
      value = Number((event.target as HTMLInputElement).value);
    }
    if (axis === "x") {
      this.x = value;
    } else if (axis === "y") {
      this.y = value;
    }
    this.anchorChange.emit({anchor: [this.x, this.y]});
    this.anchorChangeEnd.emit({anchor: [this.x, this.y]});
  }
}
