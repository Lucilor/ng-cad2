import {Directive, Input} from "@angular/core";

@Directive({
  selector: "[appTypedTemplate]"
})
export class TypedTemplateDirective<T> {
  @Input() appTypedTemplate!: T;

  static ngTemplateContextGuard<T>(dir: TypedTemplateDirective<T>, ctx: any): ctx is T {
    return true;
  }
}
