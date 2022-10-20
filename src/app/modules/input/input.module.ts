import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatTooltipModule} from "@angular/material/tooltip";
import {DirectivesModule} from "@modules/directives/directives.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {AnchorSelectorComponent} from "./components/anchor-selector/anchor-selector.component";
import {InputComponent} from "./components/input.component";

@NgModule({
    declarations: [AnchorSelectorComponent, InputComponent],
    imports: [
        ColorChromeModule,
        ColorCircleModule,
        CommonModule,
        DirectivesModule,
        FormsModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatMenuModule,
        MatSelectModule,
        MatTooltipModule,
        ReactiveFormsModule
    ],
    exports: [AnchorSelectorComponent, InputComponent]
})
export class InputModule {}
