import {DragDropModule} from "@angular/cdk/drag-drop";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDividerModule} from "@angular/material/divider";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabsModule} from "@angular/material/tabs";
import {MatTooltipModule} from "@angular/material/tooltip";
import {RouterTestingModule} from "@angular/router/testing";
import {AnchorSelectorComponent} from "@components/anchor-selector/anchor-selector.component";
import {CadPointsComponent} from "@components/cad-points/cad-points.component";
import {CadDimensionComponent} from "@components/menu/cad-dimension/cad-dimension.component";
import {CadInfoComponent} from "@components/menu/cad-info/cad-info.component";
import {CadLineComponent} from "@components/menu/cad-line/cad-line.component";
import {CadMtextComponent} from "@components/menu/cad-mtext/cad-mtext.component";
import {SubCadsComponent} from "@components/menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "@components/menu/toolbar/toolbar.component";
import {CadConsoleModule} from "@modules/cad-console/cad-console.module";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {NgScrollbarModule} from "ngx-scrollbar";
import {IndexComponent} from "./index.component";

describe("IndexComponent", () => {
    let component: IndexComponent;
    let fixture: ComponentFixture<IndexComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                IndexComponent,
                CadInfoComponent,
                CadPointsComponent,
                SubCadsComponent,
                ToolbarComponent,
                CadLineComponent,
                CadMtextComponent,
                CadDimensionComponent,
                AnchorSelectorComponent
            ],
            imports: [
                CadConsoleModule,
                ColorChromeModule,
                ColorCircleModule,
                DragDropModule,
                FormsModule,
                HttpModule,
                MatAutocompleteModule,
                MatButtonModule,
                MatCardModule,
                MatCheckboxModule,
                MatDividerModule,
                MatExpansionModule,
                MatIconModule,
                MatInputModule,
                MatMenuModule,
                MatSelectModule,
                MatSlideToggleModule,
                MatTabsModule,
                MatTooltipModule,
                MessageModule,
                NgScrollbarModule,
                RouterTestingModule.withRoutes([{path: "index", component: IndexComponent}]),
                SpinnerModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(IndexComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
