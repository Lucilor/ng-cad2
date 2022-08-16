import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {CadPointsComponent} from "@components/cad-points/cad-points.component";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";

import {CadInfoComponent} from "./cad-info.component";

describe("CadInfoComponent", () => {
    let component: CadInfoComponent;
    let fixture: ComponentFixture<CadInfoComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadInfoComponent, CadPointsComponent],
            imports: [FormsModule, HttpModule, InputModule, MatFormFieldModule, MatIconModule, MatInputModule, MessageModule, SpinnerModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
