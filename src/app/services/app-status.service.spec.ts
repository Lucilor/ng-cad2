import {TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {AppStatusService} from "./app-status.service";

describe("AppStatusService", () => {
    let service: AppStatusService;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HttpModule, RouterTestingModule]});
        service = TestBed.inject(AppStatusService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
