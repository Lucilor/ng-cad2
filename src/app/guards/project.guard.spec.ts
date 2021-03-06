import {TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {ProjectGuard} from "./project.guard";

describe("ProjectGuard", () => {
    let guard: ProjectGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HttpModule, MessageModule, RouterTestingModule]});
        guard = TestBed.inject(ProjectGuard);
    });

    it("should be created", () => {
        expect(guard).toBeTruthy();
    });
});
