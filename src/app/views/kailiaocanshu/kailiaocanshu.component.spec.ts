import {ComponentFixture, TestBed} from "@angular/core/testing";
import {KailiaocanshuComponent} from "./kailiaocanshu.component";

describe("KailiaocanshuComponent", () => {
    let component: KailiaocanshuComponent;
    let fixture: ComponentFixture<KailiaocanshuComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [KailiaocanshuComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(KailiaocanshuComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
