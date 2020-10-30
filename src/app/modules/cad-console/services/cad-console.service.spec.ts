import {TestBed} from "@angular/core/testing";

import {CadConsoleService} from "./cad-console.service";

describe("CadConsoleService", () => {
	let service: CadConsoleService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(CadConsoleService);
	});

	it("should be created", () => {
		expect(service).toBeTruthy();
	});
});
