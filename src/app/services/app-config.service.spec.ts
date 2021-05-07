import {TestBed} from "@angular/core/testing";
import {HttpModule} from "@modules/http/http.module";

import {AppConfigService} from "./app-config.service";

describe("AppConfigService", () => {
    let service: AppConfigService;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HttpModule]});
        service = TestBed.inject(AppConfigService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
