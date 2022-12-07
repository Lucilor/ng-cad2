import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {FormulasEditorComponent} from "./formulas-editor.component";

describe("FormulasEditorComponent", () => {
  let component: FormulasEditorComponent;
  let fixture: ComponentFixture<FormulasEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormulasEditorComponent],
      imports: [HttpModule, InputModule, MessageModule, NgScrollbarModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FormulasEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
