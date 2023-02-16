import {ComponentFixture, TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SuanliaoComponent} from "./suanliao.component";

describe("SuanliaoComponent", () => {
  let component: SuanliaoComponent;
  let fixture: ComponentFixture<SuanliaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SuanliaoComponent],
      imports: [HttpModule, MessageModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SuanliaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
