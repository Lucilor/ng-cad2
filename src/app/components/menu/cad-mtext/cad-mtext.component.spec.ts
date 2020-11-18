import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {ColorChromeModule} from "ngx-color/chrome";
import {AnchorSelectorComponent} from "../../anchor-selector/anchor-selector.component";

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
                MatInputModule,
                MatFormFieldModule,
                MatMenuModule,
                MatSelectModule,
                MessageModule
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
