import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {CadConsoleModule} from "@src/app/modules/cad-console/cad-console.module";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";

import {CadLineComponent} from "./cad-line.component";

describe("CadLineComponent", () => {
    let component: CadLineComponent;
    let fixture: ComponentFixture<CadLineComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadLineComponent],
            imports: [
                FormsModule,
                MatButtonModule,
                MatFormFieldModule,
                MatIconModule,
                MatInputModule,
                MatSelectModule,
                MatSlideToggleModule,
                CadConsoleModule,
                HttpModule,
                MessageModule,
                // ColorPickerModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadLineComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
