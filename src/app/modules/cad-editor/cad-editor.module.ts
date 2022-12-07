import {DragDropModule} from "@angular/cdk/drag-drop";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatOptionModule} from "@angular/material/core";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {CadConsoleModule} from "@modules/cad-console/cad-console.module";
import {InputModule} from "@modules/input/input.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadEditorComponent} from "./components/cad-editor/cad-editor.component";
import {CadPointsComponent} from "./components/cad-points/cad-points.component";
import {CadAssembleFormComponent} from "./components/dialogs/cad-assemble-form/cad-assemble-form.component";
import {CadDataAttrsComponent} from "./components/dialogs/cad-data-attrs/cad-data-attrs.component";
import {CadDimensionFormComponent} from "./components/dialogs/cad-dimension-form/cad-dimension-form.component";
import {CadAssembleComponent} from "./components/menu/cad-assemble/cad-assemble.component";
import {CadDimensionComponent} from "./components/menu/cad-dimension/cad-dimension.component";
import {CadInfoComponent} from "./components/menu/cad-info/cad-info.component";
import {CadLayerInputComponent} from "./components/menu/cad-layer-input/cad-layer-input.component";
import {CadLineComponent} from "./components/menu/cad-line/cad-line.component";
import {CadMtextComponent} from "./components/menu/cad-mtext/cad-mtext.component";
import {CadSplitComponent} from "./components/menu/cad-split/cad-split.component";
import {SubCadsComponent} from "./components/menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "./components/menu/toolbar/toolbar.component";

@NgModule({
  declarations: [
    CadAssembleComponent,
    CadAssembleFormComponent,
    CadDataAttrsComponent,
    CadDimensionComponent,
    CadDimensionFormComponent,
    CadEditorComponent,
    CadInfoComponent,
    CadLayerInputComponent,
    CadLineComponent,
    CadMtextComponent,
    CadPointsComponent,
    CadSplitComponent,
    SubCadsComponent,
    ToolbarComponent
  ],
  imports: [
    CadConsoleModule,
    ColorChromeModule,
    ColorCircleModule,
    CommonModule,
    DragDropModule,
    FormsModule,
    InputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatOptionModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule,
    NgScrollbarModule,
    ReactiveFormsModule,
    SpinnerModule
  ],
  exports: [CadEditorComponent]
})
export class CadEditorModule {}
