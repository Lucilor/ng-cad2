import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {timeout} from "@utils";
import {InputComponent} from "./input.component";

describe("InputComponent", () => {
  let component: InputComponent;
  let fixture: ComponentFixture<InputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InputComponent],
      imports: [FormsModule, HttpModule, MatFormFieldModule, MatInputModule, MatSelectModule, MessageModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InputComponent);
    component = fixture.componentInstance;
    const label = "test";
    component.info = {type: "string", label, textarea: {autosize: {minRows: 1, maxRows: 3}}};
    await timeout(0);
    component.info = {type: "number", label};
    await timeout(0);
    component.info = {type: "boolean", label};
    await timeout(0);
    component.info = {type: "object", label};
    await timeout(0);
    component.info = {type: "array", label};
    await timeout(0);
    component.info = {type: "select", label: "test", options: ["a", "b", "c"]};
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
