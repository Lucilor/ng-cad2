import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabsModule} from "@angular/material/tabs";
import {CadPointsComponent} from "@src/app/components/cad-points/cad-points.component";
import {CadInfoComponent} from "@src/app/components/menu/cad-info/cad-info.component";
import {SubCadsComponent} from "@src/app/components/menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "@src/app/components/menu/toolbar/toolbar.component";
import {CadConsoleModule} from "@src/app/modules/cad-console/cad-console.module";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {IndexComponent} from "./index.component";

describe("IndexComponent", () => {
    let component: IndexComponent;
    let fixture: ComponentFixture<IndexComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [IndexComponent, CadInfoComponent, CadPointsComponent, SubCadsComponent, ToolbarComponent],
            imports: [
                FormsModule,
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
