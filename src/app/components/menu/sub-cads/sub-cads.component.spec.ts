import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatMenuModule} from "@angular/material/menu";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {SubCadsComponent} from "./sub-cads.component";

describe("SubCadsComponent", () => {
    let component: SubCadsComponent;
    let fixture: ComponentFixture<SubCadsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SubCadsComponent],
            imports: [
                MatDialogModule,
                MatDividerModule,
                MatExpansionModule,
                MatMenuModule,
                MatSlideToggleModule,
                HttpModule,
                MessageModule,
                PerfectScrollbarModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SubCadsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });

    it("should show menu", () => {
        component.contextMenu.openMenu();
    });
});
