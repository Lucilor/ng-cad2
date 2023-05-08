import {Directive, HostListener} from "@angular/core";

@Directive({
  selector: "[appClickStop]"
})
export class ClickStopPropagationDirective {
  @HostListener("click", ["$event"])
  public onClick(event: MouseEvent) {
    event.stopPropagation();
  }
}
