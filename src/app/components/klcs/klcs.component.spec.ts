import {ComponentFixture, TestBed} from "@angular/core/testing";
import {importObject} from "@lucilor/utils";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {defaultQiezhongkongItem, KailiaocanshuData, KlcsComponent, QiezhongkongItem} from "./klcs.component";

const 参数: QiezhongkongItem[] = [importObject({}, defaultQiezhongkongItem)];
const data: KailiaocanshuData = {_id: "1", 名字: "test", 分类: "切中空", 参数};

describe("KlcsComponent", () => {
  let component: KlcsComponent;
  let fixture: ComponentFixture<KlcsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KlcsComponent],
      imports: [HttpModule, InputModule, NgScrollbarModule]
    }).compileComponents();

    fixture = TestBed.createComponent(KlcsComponent);
    component = fixture.componentInstance;
    component.data = data;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
