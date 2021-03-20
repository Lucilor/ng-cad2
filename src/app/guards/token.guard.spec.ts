import {TestBed} from "@angular/core/testing";
import {HttpModule} from "../modules/http/http.module";
import {MessageModule} from "../modules/message/message.module";
import {TokenGuard} from "./token.guard";

describe("TokenGuard", () => {
    let guard: TokenGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HttpModule, MessageModule]});
        guard = TestBed.inject(TokenGuard);
    });

    it("should be created", () => {
        expect(guard).toBeTruthy();
    });
});
