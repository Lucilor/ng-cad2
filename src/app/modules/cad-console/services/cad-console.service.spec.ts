import {TestBed} from "@angular/core/testing";
import {CadConsoleModule} from "../cad-console.module";

import {CadConsoleService} from "./cad-console.service";

describe("CadConsoleService", () => {
    let service: CadConsoleService;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [CadConsoleModule]});
        service = TestBed.inject(CadConsoleService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
