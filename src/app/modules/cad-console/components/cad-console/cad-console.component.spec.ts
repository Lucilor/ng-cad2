import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";

import {CadConsoleComponent} from "./cad-console.component";

describe("CadConsoleComponent", () => {
    let component: CadConsoleComponent;
    let fixture: ComponentFixture<CadConsoleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadConsoleComponent],
            imports: [MatSnackBarModule, HttpModule, MessageModule]
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
