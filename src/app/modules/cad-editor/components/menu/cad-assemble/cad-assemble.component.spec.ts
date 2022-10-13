import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {CadAssembleComponent} from "./cad-assemble.component";

describe("CadAssembleComponent", () => {
    let component: CadAssembleComponent;
    let fixture: ComponentFixture<CadAssembleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadAssembleComponent],
            imports: [FormsModule, HttpModule, MatFormFieldModule, MatInputModule, MatSelectModule, MessageModule, SpinnerModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadAssembleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
