import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {CadDimensionLinear} from "@cad-viewer";
import {NgScrollbarModule} from "ngx-scrollbar";
import {CadDimensionData, CadDimensionFormComponent} from "./cad-dimension-form.component";

const data: CadDimensionData = {data: new CadDimensionLinear()};
describe("CadDimensionFormComponent", () => {
  let component: CadDimensionFormComponent;
  let fixture: ComponentFixture<CadDimensionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CadDimensionFormComponent],
      imports: [
        BrowserAnimationsModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSlideToggleModule,
        NgScrollbarModule,
        ReactiveFormsModule
      ],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CadDimensionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
