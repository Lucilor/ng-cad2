import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatMenuModule} from "@angular/material/menu";
import {CadConsoleModule} from "@src/app/modules/cad-console/cad-console.module";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";

import {ToolbarComponent} from "./toolbar.component";

describe("ToolbarComponent", () => {
    let component: ToolbarComponent;
    let fixture: ComponentFixture<ToolbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ToolbarComponent],
            imports: [MatMenuModule, CadConsoleModule, HttpModule, MessageModule]
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
