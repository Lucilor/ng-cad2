import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MessageModule} from "@modules/message/message.module";
import {MessageTestComponent} from "./message-test.component";

describe("MessageTestComponent", () => {
  let component: MessageTestComponent;
  let fixture: ComponentFixture<MessageTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessageTestComponent],
      imports: [MessageModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MessageTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
