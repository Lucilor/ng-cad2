import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {RouterTestingModule} from "@angular/router/testing";
import {MsbjRectsComponent} from "@components/msbj-rects/msbj-rects.component";
import {HttpModule} from "@modules/http/http.module";
import {XhmrmsbjComponent} from "./xhmrmsbj.component";

describe("XhmrmsbjComponent", () => {
  let component: XhmrmsbjComponent;
  let fixture: ComponentFixture<XhmrmsbjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MsbjRectsComponent, XhmrmsbjComponent],
      imports: [HttpModule, MatButtonModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
