import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {DrawCadComponent, DrawCadInput} from "./draw-cad.component";

const data: DrawCadInput = {collection: "cad", cads: [new CadData({name: "test"})]};
describe("DrawCadComponent", () => {
  let component: DrawCadComponent;
  let fixture: ComponentFixture<DrawCadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DrawCadComponent],
      imports: [HttpModule, MessageModule, NgScrollbarModule],
      providers: [
        {provide: MatDialogRef, useValue: {}},
        {provide: MAT_DIALOG_DATA, useValue: data}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DrawCadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
