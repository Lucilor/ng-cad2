import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {CadSplitComponent} from "./cad-split.component";

describe("CadSplitComponent", () => {
  let component: CadSplitComponent;
  let fixture: ComponentFixture<CadSplitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CadSplitComponent],
      imports: [HttpModule, MessageModule, RouterTestingModule, SpinnerModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadSplitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
