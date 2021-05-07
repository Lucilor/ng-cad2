import {TestBed} from "@angular/core/testing";
import {HttpModule} from "../http.module";
import {CadDataService} from "./cad-data.service";

describe("CadDataService", () => {
    let service: CadDataService;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HttpModule]});
        service = TestBed.inject(CadDataService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
