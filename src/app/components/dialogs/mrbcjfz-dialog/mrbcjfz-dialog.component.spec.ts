import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {MrbcjfzComponent} from "@views/mrbcjfz/mrbcjfz.component";
import {NgScrollbarModule} from "ngx-scrollbar";
import {MrbcjfzDialogComponent, MrbcjfzDialogInput} from "./mrbcjfz-dialog.component";

const data: MrbcjfzDialogInput = {id: 1, table: "p_xinghao"};

describe("MrbcjfzDialogComponent", () => {
  let component: MrbcjfzDialogComponent;
  let fixture: ComponentFixture<MrbcjfzDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MrbcjfzComponent, MrbcjfzDialogComponent],
      imports: [HttpModule, MatDividerModule, MatButtonModule, RouterTestingModule, NgScrollbarModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MrbcjfzDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
