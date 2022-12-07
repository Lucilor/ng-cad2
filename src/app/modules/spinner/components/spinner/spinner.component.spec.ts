import {ComponentFixture, TestBed} from "@angular/core/testing";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {SpinnerComponent} from "./spinner.component";

describe("SpinnerComponent", () => {
  let component: SpinnerComponent;
  let fixture: ComponentFixture<SpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SpinnerComponent],
      imports: [SpinnerModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
