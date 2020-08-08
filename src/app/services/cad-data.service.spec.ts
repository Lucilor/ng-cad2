import {TestBed} from "@angular/core/testing";

import {CadDataService} from "./cad-data.service";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "../store/state";
import {RouterTestingModule} from "@angular/router/testing";

describe("CadDataService", () => {
	let service: CadDataService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, RouterTestingModule],
			providers: [provideMockStore({initialState})]
		});
		service = TestBed.inject(CadDataService);
	});

	it("should be created", () => {
		expect(service).toBeTruthy();
	});
});
