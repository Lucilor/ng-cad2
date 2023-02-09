import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MessageModule} from "@modules/message/message.module";
import {SuanliaoComponent} from "./suanliao.component";

describe("SuanliaoComponent", () => {
  let component: SuanliaoComponent;
  let fixture: ComponentFixture<SuanliaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SuanliaoComponent],
      imports: [MessageModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
