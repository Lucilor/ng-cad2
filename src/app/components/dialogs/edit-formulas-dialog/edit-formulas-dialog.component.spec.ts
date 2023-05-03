import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {FormulasEditorComponent} from "@components/formulas-editor/formulas-editor.component";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {EditFormulasDialogComponent, EditFormulasInput} from "./edit-formulas-dialog.component";

const data: EditFormulasInput = {formulas: {a: 1, b: 2}};

describe("EditFormulasDialogComponent", () => {
  let component: EditFormulasDialogComponent;
  let fixture: ComponentFixture<EditFormulasDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditFormulasDialogComponent, FormulasEditorComponent],
      imports: [HttpModule, InputModule, MatIconModule, MessageModule, NgScrollbarModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditFormulasDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
