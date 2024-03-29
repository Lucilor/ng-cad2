import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatMenuModule} from "@angular/material/menu";
import {timeout} from "@lucilor/utils";
import {DirectivesModule} from "@modules/directives/directives.module";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {ZixuanpeijianComponent} from "./zixuanpeijian.component";
import {getTestData} from "./zixuanpeijian.types";

const data = getTestData();

describe("ZixuanpeijianComponent", () => {
  let component: ZixuanpeijianComponent;
  let fixture: ComponentFixture<ZixuanpeijianComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ZixuanpeijianComponent],
      imports: [DirectivesModule, HttpModule, MatButtonModule, MatMenuModule, MessageModule, NgScrollbarModule, SpinnerModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ZixuanpeijianComponent);
    component = fixture.componentInstance;
    await timeout(200);
    component.setStep(3);
    await timeout(200);
    component.setStep(2);
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
