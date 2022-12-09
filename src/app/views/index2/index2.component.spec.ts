import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {CadEditorModule} from "@modules/cad-editor/cad-editor.module";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {Index2Component} from "./index2.component";

describe("Index2Component", () => {
  let component: Index2Component;
  let fixture: ComponentFixture<Index2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Index2Component],
      imports: [
        CadEditorModule,
        FormsModule,
        HttpModule,
        InputModule,
        MatButtonModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MessageModule,
        NgScrollbarModule,
        ReactiveFormsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Index2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
