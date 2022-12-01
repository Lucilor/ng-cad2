import {DragDropModule} from "@angular/cdk/drag-drop";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
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
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {NgScrollbarModule} from "ngx-scrollbar";
import {AnchorSelectorComponent} from "../../../input/components/anchor-selector/anchor-selector.component";
import {CadPointsComponent} from "../cad-points/cad-points.component";
import {CadDimensionComponent} from "../menu/cad-dimension/cad-dimension.component";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";
import {CadLayerInputComponent} from "../menu/cad-layer-input/cad-layer-input.component";
import {CadLineComponent} from "../menu/cad-line/cad-line.component";
import {CadMtextComponent} from "../menu/cad-mtext/cad-mtext.component";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {CadEditorComponent} from "./cad-editor.component";

describe("CadEditorComponent", () => {
  let component: CadEditorComponent;
  let fixture: ComponentFixture<CadEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AnchorSelectorComponent,
        CadDimensionComponent,
        CadEditorComponent,
        CadInfoComponent,
        CadLayerInputComponent,
        CadLineComponent,
        CadMtextComponent,
        CadPointsComponent,
        SubCadsComponent,
        ToolbarComponent
      ],
      imports: [
        CadConsoleModule,
        ColorChromeModule,
        ColorCircleModule,
        DragDropModule,
        FormsModule,
        HttpModule,
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
        SpinnerModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CadEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
