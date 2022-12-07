import {TestBed} from "@angular/core/testing";
import {HttpModule} from "../http.module";
import {HttpService} from "./http.service";

describe("HttpService", () => {
  let service: HttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [HttpModule]});
    service = TestBed.inject(HttpService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
