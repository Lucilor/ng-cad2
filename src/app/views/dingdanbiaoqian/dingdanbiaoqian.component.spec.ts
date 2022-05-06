import {ComponentFixture, TestBed} from "@angular/core/testing";
import {DingdanbiaoqianComponent} from "./dingdanbiaoqian.component";

describe("DingdanbiaoqianComponent", () => {
    let component: DingdanbiaoqianComponent;
    let fixture: ComponentFixture<DingdanbiaoqianComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DingdanbiaoqianComponent]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DingdanbiaoqianComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
