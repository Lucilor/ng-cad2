import {TestBed} from "@angular/core/testing";
import {MessageModule} from "@modules/message/message.module";
import {CalcService} from "./calc.service";

describe("CalcService", () => {
    let service: CalcService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MessageModule]
        });
        service = TestBed.inject(CalcService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
