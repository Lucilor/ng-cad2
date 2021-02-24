import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CadDimension} from "@src/app/cad-viewer";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {CadDimensionData, CadDimensionFormComponent} from "./cad-dimension-form.component";

const data: CadDimensionData = {data: new CadDimension()};
describe("CadDimensionFormComponent", () => {
    let component: CadDimensionFormComponent;
    let fixture: ComponentFixture<CadDimensionFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadDimensionFormComponent],
            imports: [
                FormsModule,
                ReactiveFormsModule,
                MatInputModule,
                MatFormFieldModule,
                MatSelectModule,
                MatSlideToggleModule,
                BrowserAnimationsModule,
                PerfectScrollbarModule
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadDimensionFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    fit("should create", () => {
        expect(component).toBeTruthy();
    });
});
