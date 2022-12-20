import {DragDropModule} from "@angular/cdk/drag-drop";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatListModule} from "@angular/material/list";
import {MatSliderModule} from "@angular/material/slider";
import {RouterTestingModule} from "@angular/router/testing";
import {DirectivesModule} from "@modules/directives/directives.module";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {MsbjComponent} from "./msbj.component";

describe("MsbjComponent", () => {
  let component: MsbjComponent;
  let fixture: ComponentFixture<MsbjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MsbjComponent],
      imports: [
        DirectivesModule,
        DragDropModule,
        FormsModule,
        HttpModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatSliderModule,
        MessageModule,
        NgScrollbarModule,
        RouterTestingModule,
        SpinnerModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MsbjComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
