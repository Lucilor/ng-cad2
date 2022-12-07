import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {JiaoweiComponent} from "./jiaowei.component";

describe("JiaoweiComponent", () => {
  let component: JiaoweiComponent;
  let fixture: ComponentFixture<JiaoweiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JiaoweiComponent],
      imports: [HttpModule, MatButtonModule, MessageModule, NgScrollbarModule, SpinnerModule]
    }).compileComponents();

    fixture = TestBed.createComponent(JiaoweiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
