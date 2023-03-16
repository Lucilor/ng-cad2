import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {RouterTestingModule} from "@angular/router/testing";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {DirectivesModule} from "@modules/directives/directives.module";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {XhmrmsbjComponent} from "./xhmrmsbj.component";

describe("XhmrmsbjComponent", () => {
  let component: XhmrmsbjComponent;
  let fixture: ComponentFixture<XhmrmsbjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MsbjRectsComponent, XhmrmsbjComponent],
      imports: [
        DirectivesModule,
        FormsModule,
        HttpModule,
        MatButtonModule,
        MatDividerModule,
        MatSlideToggleModule,
        MessageModule,
        NgScrollbarModule,
        RouterTestingModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
