import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {CadPointsComponent} from "./cad-points.component";

describe("CadPointsComponent", () => {
  let component: CadPointsComponent;
  let fixture: ComponentFixture<CadPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CadPointsComponent],
      imports: [HttpModule, MessageModule, SpinnerModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
