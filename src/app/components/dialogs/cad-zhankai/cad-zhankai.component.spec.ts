import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {RouterTestingModule} from "@angular/router/testing";
import {CadData, CadZhankai} from "@cad-viewer";
import {ReplaceFullCharsDirective} from "@directives/replace-full-chars.directive";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadZhankaiComponent} from "./cad-zhankai.component";

const item = new CadZhankai();
item.chai = true;
item.conditions = ["asd", "qdqwd"];
item.flip = [{kaiqi: "a", chanpinfenlei: "b", fanzhuanfangshi: "vh"}];
item.flipChai = {1: "h", 2: "v"};
const data: CadData["zhankai"] = [item];
describe("CadZhankaiComponent", () => {
    let component: CadZhankaiComponent;
    let fixture: ComponentFixture<CadZhankaiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadZhankaiComponent, ReplaceFullCharsDirective],
            imports: [
                BrowserAnimationsModule,
                FormsModule,
                MatCardModule,
                MatCheckboxModule,
                MatFormFieldModule,
                MatIconModule,
                MatInputModule,
                MatSelectModule,
                MatSlideToggleModule,
                MessageModule,
                NgScrollbarModule,
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
