import {TestBed} from "@angular/core/testing";
import {HttpModule} from "../modules/http/http.module";
import {MessageModule} from "../modules/message/message.module";

import {AppStatusService} from "./app-status.service";

describe("AppStatusService", () => {
    let service: AppStatusService;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HttpModule, MessageModule]});
        service = TestBed.inject(AppStatusService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
