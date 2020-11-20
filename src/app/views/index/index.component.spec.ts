import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabsModule} from "@angular/material/tabs";
import {AnchorSelectorComponent} from "@src/app/components/anchor-selector/anchor-selector.component";
import {CadPointsComponent} from "@src/app/components/cad-points/cad-points.component";
import {CadDimensionComponent} from "@src/app/components/menu/cad-dimension/cad-dimension.component";
import {CadInfoComponent} from "@src/app/components/menu/cad-info/cad-info.component";
import {CadLineComponent} from "@src/app/components/menu/cad-line/cad-line.component";
import {CadMtextComponent} from "@src/app/components/menu/cad-mtext/cad-mtext.component";
import {SubCadsComponent} from "@src/app/components/menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "@src/app/components/menu/toolbar/toolbar.component";
import {CadConsoleModule} from "@src/app/modules/cad-console/cad-console.module";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {ColorCircleModule} from "ngx-color/circle";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";

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
                FormsModule,
                MatAutocompleteModule,
                MatButtonModule,
                MatCardModule,
                MatExpansionModule,
                MatIconModule,
                MatInputModule,
                MatMenuModule,
                MatSelectModule,
                MatSlideToggleModule,
                MatTabsModule,
                CadConsoleModule,
                HttpModule,
                MessageModule,
                ColorChromeModule,
                ColorCircleModule,
                PerfectScrollbarModule,
                NgxUiLoaderModule
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
