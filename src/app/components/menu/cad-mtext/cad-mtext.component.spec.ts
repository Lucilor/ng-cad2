import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {AnchorSelectorComponent} from "@components/anchor-selector/anchor-selector.component";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {CadMtextComponent} from "./cad-mtext.component";

describe("CadMtextComponent", () => {
    let component: CadMtextComponent;
    let fixture: ComponentFixture<CadMtextComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadMtextComponent, AnchorSelectorComponent],
            imports: [
                ColorChromeModule,
                FormsModule,
                HttpModule,
                MatAutocompleteModule,
                MatIconModule,
                MatInputModule,
                MatFormFieldModule,
                MatMenuModule,
                MatSelectModule,
                MessageModule,
                SpinnerModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadMtextComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
