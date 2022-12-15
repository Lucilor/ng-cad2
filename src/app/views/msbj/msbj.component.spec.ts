import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {MsbjComponent} from "./msbj.component";

describe("MsbjComponent", () => {
  let component: MsbjComponent;
  let fixture: ComponentFixture<MsbjComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MsbjComponent],
      imports: [HttpModule, MatButtonModule, MatIconModule, MessageModule, RouterTestingModule, SpinnerModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MsbjComponent);
    component = fixture.componentInstance;
    component.rectInfosRaw = [
      {vid: 1, isBuju: false, rect: {origin: {x: 3452.4796119402986, y: 560.9850746268658}, size: {w: 140, h: 2027}}},
      {vid: 2, isBuju: false, rect: {origin: {x: 4213.475611940299, y: 560.9850746268658}, size: {w: 154, h: 2027}}},
      {vid: 3, isBuju: true, rect: {origin: {x: 3592.4796119402986, y: 560.9850746268658}, size: {w: 620.9960000000005, h: 179}}},
      {vid: 4, isBuju: true, rect: {origin: {x: 3592.4796119402986, y: 2318.9850746268658}, size: {w: 620.9960000000005, h: 269}}},
      {vid: 5, isBuju: false, rect: {origin: {x: 3592.4796119402986, y: 739.9850746268658}, size: {w: 34, h: 1579}}},
      {vid: 5, isBuju: false, rect: {origin: {x: 3592.4796119402986, y: 739.9850746268658}, size: {w: 620.9960000000005, h: 34}}},
      {vid: 5, isBuju: false, rect: {origin: {x: 4179.475611940299, y: 739.9850746268658}, size: {w: 34, h: 1579}}},
      {vid: 5, isBuju: false, rect: {origin: {x: 3592.4796119402986, y: 2284.9850746268658}, size: {w: 620.9960000000005, h: 34}}},
      {vid: 6, isBuju: true, rect: {origin: {x: 3626.4796119402986, y: 773.9850746268658}, size: {w: 552.9960000000005, h: 1511}}}
    ];
    component.generateRects();
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
