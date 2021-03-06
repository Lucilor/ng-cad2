import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {HttpModule} from "@modules/http/http.module";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {PrintCadComponent} from "./print-cad.component";

describe("PrintCADComponent", () => {
    let component: PrintCadComponent;
    let fixture: ComponentFixture<PrintCadComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PrintCadComponent],
            imports: [HttpModule, MatSlideToggleModule, NgxUiLoaderModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PrintCadComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
