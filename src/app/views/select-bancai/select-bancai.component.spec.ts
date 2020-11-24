import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {RouterModule} from "@angular/router";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";
import {SelectBancaiComponent} from "./select-bancai.component";

describe("SelectBancaiComponent", () => {
    let component: SelectBancaiComponent;
    let fixture: ComponentFixture<SelectBancaiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SelectBancaiComponent],
            imports: [HttpModule, MatAutocompleteModule, MessageModule, NgxUiLoaderModule, PerfectScrollbarModule, RouterModule.forRoot([])]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SelectBancaiComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
