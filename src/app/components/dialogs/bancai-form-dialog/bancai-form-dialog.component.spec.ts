import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import bancaifenzuIndexData from "@assets/testData/bancaifenzuIndex.json";
import {BancaiFormComponent} from "@components/bancai-form/bancai-form.component";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {BancaiFormDialogComponent, BancaiFormInput} from "./bancai-form-dialog.component";

const data: BancaiFormInput = {data: {bancai: "", cailiao: "", houdu: "", kexuanbancai: []}, bancaiList: bancaifenzuIndexData.bancaiList};

describe("BancaiFormDialogComponent", () => {
  let component: BancaiFormDialogComponent;
  let fixture: ComponentFixture<BancaiFormDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BancaiFormComponent, BancaiFormDialogComponent],
      imports: [HttpModule, InputModule, MessageModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BancaiFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
