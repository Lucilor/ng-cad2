import {ComponentFixture, TestBed} from "@angular/core/testing";

import {ThuumComponent} from "./thuum.component";

describe("ThuumComponent", () => {
    let component: ThuumComponent;
    let fixture: ComponentFixture<ThuumComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ThuumComponent]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ThuumComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
