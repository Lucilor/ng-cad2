import {ComponentFixture, TestBed} from "@angular/core/testing";

import {BbzhmkgzComponent} from "./bbzhmkgz.component";

describe("BbzhmkgzComponent", () => {
    let component: BbzhmkgzComponent;
    let fixture: ComponentFixture<BbzhmkgzComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BbzhmkgzComponent]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BbzhmkgzComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
