import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {RouterTestingModule} from "@angular/router/testing";
import {CadData, CadZhankai} from "@src/app/cad-viewer";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {CadZhankaiComponent} from "./cad-zhankai.component";

const data: CadData["zhankai"] = [new CadZhankai()];
describe("CadZhankaiComponent", () => {
    let component: CadZhankaiComponent;
    let fixture: ComponentFixture<CadZhankaiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadZhankaiComponent],
            imports: [
                BrowserAnimationsModule,
                FormsModule,
                MatCardModule,
                MatCheckboxModule,
                MatFormFieldModule,
                MatInputModule,
                MatSelectModule,
                MatSlideToggleModule,
                MessageModule,
                PerfectScrollbarModule,
                ReactiveFormsModule,
                RouterTestingModule
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadZhankaiComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
