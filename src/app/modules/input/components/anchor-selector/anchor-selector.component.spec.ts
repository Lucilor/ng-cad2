import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {AnchorSelectorComponent} from "./anchor-selector.component";

describe("AnchorSelectorComponent", () => {
    let component: AnchorSelectorComponent;
    let fixture: ComponentFixture<AnchorSelectorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AnchorSelectorComponent],
            imports: [FormsModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule, BrowserAnimationsModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(AnchorSelectorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
