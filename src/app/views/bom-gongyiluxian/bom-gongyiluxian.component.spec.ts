import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {TableModule} from "@modules/table/table.module";
import {BomGongyiluxianComponent} from "./bom-gongyiluxian.component";

describe("BomGongyiluxianComponent", () => {
  let component: BomGongyiluxianComponent;
  let fixture: ComponentFixture<BomGongyiluxianComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BomGongyiluxianComponent],
      imports: [HttpModule, MessageModule, RouterTestingModule, TableModule]
    });
    fixture = TestBed.createComponent(BomGongyiluxianComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
