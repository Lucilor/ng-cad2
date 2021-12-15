import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {CadConsoleComponent} from "./cad-console.component";

describe("CadConsoleComponent", () => {
    let component: CadConsoleComponent;
    let fixture: ComponentFixture<CadConsoleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadConsoleComponent],
            imports: [HttpModule, MessageModule, SpinnerModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadConsoleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
