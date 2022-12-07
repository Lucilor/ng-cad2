import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CleanComponent} from "./clean.component";

describe("CleanComponent", () => {
  let component: CleanComponent;
  let fixture: ComponentFixture<CleanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CleanComponent],
      imports: [HttpModule, InputModule, MessageModule, NgScrollbarModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CleanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
