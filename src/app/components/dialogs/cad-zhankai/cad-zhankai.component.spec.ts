import {ComponentFixture, TestBed} from "@angular/core/testing";

import {CadZhankaiComponent} from "./cad-zhankai.component";

describe("CadZhankaiComponent", () => {
    let component: CadZhankaiComponent;
    let fixture: ComponentFixture<CadZhankaiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadZhankaiComponent]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadZhankaiComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
