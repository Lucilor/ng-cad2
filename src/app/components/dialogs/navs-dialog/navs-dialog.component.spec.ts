import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatIconModule} from "@angular/material/icon";
import {MatTreeModule} from "@angular/material/tree";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {NavsDialogComponent} from "./navs-dialog.component";
import {NavsDialogInput} from "./navs-dialog.types";

const data: NavsDialogInput = {
  navs: [{vid: 1, mingzi: "test", dadaohang: [{vid: 2, mingzi: "test2", xiaodaohang: [{vid: 3, mingzi: "test3", table: "1", url: "2"}]}]}]
};

describe("NavsDialogComponent", () => {
  let component: NavsDialogComponent;
  let fixture: ComponentFixture<NavsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NavsDialogComponent],
      imports: [HttpModule, InputModule, MatCheckboxModule, MatIconModule, MatTreeModule, NgScrollbarModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
