import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {NgScrollbarModule} from "ngx-scrollbar";

import {CadDataAttrsComponent, CadDataAttrsComponentData} from "./cad-data-attrs.component";

const data: CadDataAttrsComponentData = {a: "1", b: "2"};
describe("CadDataAttrsComponent", () => {
    let component: CadDataAttrsComponent;
    let fixture: ComponentFixture<CadDataAttrsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadDataAttrsComponent],
            imports: [BrowserAnimationsModule, FormsModule, MatFormFieldModule, MatIconModule, MatInputModule, NgScrollbarModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadDataAttrsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
