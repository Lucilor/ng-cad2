import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {HttpModule} from "@modules/http/http.module";
import {CadLayerInputComponent} from "./cad-layer-input.component";

describe("CadLayerInputComponent", () => {
    let component: CadLayerInputComponent;
    let fixture: ComponentFixture<CadLayerInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadLayerInputComponent],
            imports: [HttpModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadLayerInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
