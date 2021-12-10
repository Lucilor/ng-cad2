import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MessageModule} from "@modules/message/message.module";

import {ThuumComponent} from "./thuum.component";

describe("ThuumComponent", () => {
    let component: ThuumComponent;
    let fixture: ComponentFixture<ThuumComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ThuumComponent],
            imports: [MessageModule]
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
