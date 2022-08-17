import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCardModule} from "@angular/material/card";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {KailiaokongweipeizhiComponent} from "./kailiaokongweipeizhi.component";

describe("KailiaokongweipeizhiComponent", () => {
    let component: KailiaokongweipeizhiComponent;
    let fixture: ComponentFixture<KailiaokongweipeizhiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [KailiaokongweipeizhiComponent, KlkwpzComponent],
            imports: [HttpModule, InputModule, MatCardModule, MessageModule, NgScrollbarModule, SpinnerModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(KailiaokongweipeizhiComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
