import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@src/app/modules/http/http.module";
import {ImageModule} from "@src/app/modules/image/image.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {PrintCadComponent} from "./print-cad.component";

describe("PrintCADComponent", () => {
    let component: PrintCadComponent;
    let fixture: ComponentFixture<PrintCadComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PrintCadComponent],
            imports: [HttpModule, ImageModule, MessageModule, NgxUiLoaderModule, PerfectScrollbarModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PrintCadComponent);
        component = fixture.componentInstance;
        component.imgs = ["", ""];
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
