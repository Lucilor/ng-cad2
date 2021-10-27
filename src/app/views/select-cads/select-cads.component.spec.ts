import {ComponentFixture, TestBed} from "@angular/core/testing";

import {SelectCadsComponent} from "./select-cads.component";

describe("SelectCadsComponent", () => {
    let component: SelectCadsComponent;
    let fixture: ComponentFixture<SelectCadsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SelectCadsComponent]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SelectCadsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
