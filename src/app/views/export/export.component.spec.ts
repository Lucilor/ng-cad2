import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ProgressBarComponent} from "@components/progress-bar/progress-bar.component";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {ExportComponent} from "./export.component";

describe("ExportComponent", () => {
    let component: ExportComponent;
    let fixture: ComponentFixture<ExportComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ExportComponent, ProgressBarComponent],
            imports: [HttpModule, MessageModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ExportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
