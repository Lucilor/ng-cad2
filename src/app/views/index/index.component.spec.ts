import {ComponentFixture, TestBed} from "@angular/core/testing";
import {CadEditorModule} from "@modules/cad-editor/cad-editor.module";
import {HttpModule} from "@modules/http/http.module";
import {IndexComponent} from "./index.component";

describe("IndexComponent", () => {
  let component: IndexComponent;
  let fixture: ComponentFixture<IndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IndexComponent],
      imports: [CadEditorModule, HttpModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
