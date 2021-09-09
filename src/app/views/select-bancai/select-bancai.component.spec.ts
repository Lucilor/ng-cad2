import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {RouterTestingModule} from "@angular/router/testing";
import {LoaderInlineComponent} from "@components/loader-inline/loader-inline.component";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";
import {SelectBancaiComponent} from "./select-bancai.component";

describe("SelectBancaiComponent", () => {
    let component: SelectBancaiComponent;
    let fixture: ComponentFixture<SelectBancaiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SelectBancaiComponent, LoaderInlineComponent],
            imports: [
                FormsModule,
                HttpModule,
                MatAutocompleteModule,
                MatSlideToggleModule,
                MessageModule,
                NgxUiLoaderModule,
                PerfectScrollbarModule,
                RouterTestingModule
            ]
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
