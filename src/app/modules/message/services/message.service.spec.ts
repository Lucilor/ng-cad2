import {TestBed} from "@angular/core/testing";
import {MessageModule} from "../message.module";
import {MessageService} from "./message.service";

describe("MessageService", () => {
    let service: MessageService;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [MessageModule]});
        service = TestBed.inject(MessageService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
