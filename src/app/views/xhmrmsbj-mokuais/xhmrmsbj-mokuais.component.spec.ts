import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {FormulasComponent} from "@components/formulas/formulas.component";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {XhmrmsbjMokuaisComponent, XhmrmsbjMokuaisInput} from "./xhmrmsbj-mokuais.component";

const data: XhmrmsbjMokuaisInput = {
  data: {
    input: {
      materialResult: {},
      gongshi: {},
      inputResult: {},
      型号选中门扇布局: {},
      配件模块CAD: {},
      门扇布局CAD: [],
      bujuNames: [],
      varNames: []
    },
    output: {
      fulfilled: true,
      materialResult: {},
      配件模块CAD: [],
      门扇布局CAD: []
    }
  }
};

describe("XhmrmsbjMokuaisComponent", () => {
  let component: XhmrmsbjMokuaisComponent;
  let fixture: ComponentFixture<XhmrmsbjMokuaisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [XhmrmsbjMokuaisComponent, FormulasComponent],
      imports: [MatButtonModule, MatDividerModule, MessageModule, NgScrollbarModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(XhmrmsbjMokuaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
