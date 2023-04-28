import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {XinghaoOverviewComponent} from "./xinghao-overview.component";

describe("XinghaoOverviewComponent", () => {
  let component: XinghaoOverviewComponent;
  let fixture: ComponentFixture<XinghaoOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [XinghaoOverviewComponent],
      imports: [HttpModule, MessageModule]
    }).compileComponents();

    fixture = TestBed.createComponent(XinghaoOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
