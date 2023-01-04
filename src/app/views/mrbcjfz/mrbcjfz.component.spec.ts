import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {MrbcjfzComponent} from "./mrbcjfz.component";

describe("MrbcjfzComponent", () => {
  let component: MrbcjfzComponent;
  let fixture: ComponentFixture<MrbcjfzComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MrbcjfzComponent],
      imports: [HttpModule, MatDividerModule, MatButtonModule, RouterTestingModule, NgScrollbarModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MrbcjfzComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
