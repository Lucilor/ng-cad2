import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {NgScrollbarModule} from "ngx-scrollbar";
import {SelectBancaiCadsComponent, SelectBancaiCadsData} from "./select-bancai-cads.component";

const data: SelectBancaiCadsData = {
  cads: [
    {
      id: "cad1",
      name: "cad1",
      width: 1000,
      height: 1000,
      num: 1,
      bancai: {mingzi: "baicai1", cailiao: "cailiao1", houdu: "1.2", guige: [2000, 2000]},
      checked: false,
      oversized: false,
      disabled: false
    },
    {
      id: "cad2",
      name: "cad2",
      width: 10000,
      height: 10000,
      num: 2,
      bancai: {mingzi: "baicai2", cailiao: "cailiao2", houdu: "0.8", guige: [2000, 2000]},
      checked: true,
      oversized: true,
      disabled: true
    }
  ]
};
describe("SelectBancaiCadsComponent", () => {
  let component: SelectBancaiCadsComponent;
  let fixture: ComponentFixture<SelectBancaiCadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectBancaiCadsComponent],
      imports: [FormsModule, MatCheckboxModule, NgScrollbarModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectBancaiCadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
