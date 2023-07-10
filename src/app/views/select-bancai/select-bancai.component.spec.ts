import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatMenuModule} from "@angular/material/menu";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {SelectBancaiComponent} from "./select-bancai.component";

describe("SelectBancaiComponent", () => {
  let component: SelectBancaiComponent;
  let fixture: ComponentFixture<SelectBancaiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectBancaiComponent],
      imports: [
        FormsModule,
        HttpModule,
        InputModule,
        MatMenuModule,
        MatSlideToggleModule,
        MessageModule,
        NgScrollbarModule,
        RouterTestingModule,
        SpinnerModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectBancaiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
