import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {Index2Component} from "./index2.component";

describe("Index2Component", () => {
  let component: Index2Component;
  let fixture: ComponentFixture<Index2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Index2Component],
      imports: [HttpModule, InputModule, MatButtonModule, MatDividerModule, MessageModule, NgScrollbarModule]
    }).compileComponents();

    fixture = TestBed.createComponent(Index2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
