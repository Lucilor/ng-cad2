import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";

import {CadPointsComponent} from "./cad-points.component";

describe("CadPointsComponent", () => {
    let component: CadPointsComponent;
    let fixture: ComponentFixture<CadPointsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadPointsComponent],
            imports: [HttpModule, MessageModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadPointsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
