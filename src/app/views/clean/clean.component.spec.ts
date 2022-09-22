import {ComponentFixture, TestBed} from "@angular/core/testing";
import {CleanComponent} from "./clean.component";

describe("CleanComponent", () => {
    let component: CleanComponent;
    let fixture: ComponentFixture<CleanComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CleanComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(CleanComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
