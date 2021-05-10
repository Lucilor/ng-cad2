import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDividerModule} from "@angular/material/divider";
import {MatMenuModule} from "@angular/material/menu";
import {RouterTestingModule} from "@angular/router/testing";
import {CadConsoleModule} from "@modules/cad-console/cad-console.module";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {ToolbarComponent} from "./toolbar.component";

describe("ToolbarComponent", () => {
    let component: ToolbarComponent;
    let fixture: ComponentFixture<ToolbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ToolbarComponent],
            imports: [MatDividerModule, MatMenuModule, CadConsoleModule, HttpModule, MessageModule, RouterTestingModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
