import {ComponentFixture, TestBed} from "@angular/core/testing";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {LoaderInlineComponent} from "./loader-inline.component";

describe("LoaderInlineComponent", () => {
    let component: LoaderInlineComponent;
    let fixture: ComponentFixture<LoaderInlineComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LoaderInlineComponent],
            imports: [NgxUiLoaderModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(LoaderInlineComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
