import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MessageModule} from "@app/modules/message/message.module";
import {CadLineTjqzSelectComponent} from "./cad-line-tjqz-select.component";

describe("CadLineTjqzSelectComponent", () => {
  let component: CadLineTjqzSelectComponent;
  let fixture: ComponentFixture<CadLineTjqzSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CadLineTjqzSelectComponent],
      imports: [MatFormFieldModule, MessageModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: {}}
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadLineTjqzSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
