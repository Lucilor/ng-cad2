import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {RouterTestingModule} from "@angular/router/testing";
import {CadData, CadZhankai} from "@lucilor/cad-viewer";
import {DirectivesModule} from "@modules/directives/directives.module";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
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
      declarations: [CadZhankaiComponent],
      imports: [
        BrowserAnimationsModule,
        DirectivesModule,
        FormsModule,
        HttpModule,
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
        RouterTestingModule,
        SpinnerModule
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
