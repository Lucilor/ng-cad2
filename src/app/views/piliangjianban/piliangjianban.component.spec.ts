import {ComponentFixture, TestBed} from "@angular/core/testing";

import {PiliangjianbanComponent} from "./piliangjianban.component";

describe("PiliangjianbanComponent", () => {
    let component: PiliangjianbanComponent;
    let fixture: ComponentFixture<PiliangjianbanComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PiliangjianbanComponent]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PiliangjianbanComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
