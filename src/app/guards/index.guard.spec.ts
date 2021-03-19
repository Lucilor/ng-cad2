import {TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {MessageModule} from "../modules/message/message.module";
import {IndexGuard} from "./index.guard";

describe("IndexGuard", () => {
    let guard: IndexGuard;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [MessageModule, RouterTestingModule]});
        guard = TestBed.inject(IndexGuard);
    });

    it("should be created", () => {
        expect(guard).toBeTruthy();
    });
});
