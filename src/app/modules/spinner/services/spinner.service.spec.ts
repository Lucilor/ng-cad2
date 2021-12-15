import {TestBed} from "@angular/core/testing";
import {SpinnerModule} from "../spinner.module";
import {SpinnerService} from "./spinner.service";

describe("SpinnerService", () => {
    let service: SpinnerService;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [SpinnerModule]});
        service = TestBed.inject(SpinnerService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
