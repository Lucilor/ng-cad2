import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {ClickStopPropagationDirective} from "./click-stop-propagation.directive";
import {ReplaceFullCharsDirective} from "./replace-full-chars.directive";
import {TypedTemplateDirective} from "./typed-template.directive";

@NgModule({
    declarations: [ClickStopPropagationDirective, ReplaceFullCharsDirective, TypedTemplateDirective],
    imports: [CommonModule],
    exports: [ClickStopPropagationDirective, ReplaceFullCharsDirective, TypedTemplateDirective]
})
export class DirectivesModule {}
