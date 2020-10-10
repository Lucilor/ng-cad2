import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {CadConsoleComponent} from "./cad-console.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {RouterTestingModule} from "@angular/router/testing";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@app/store/state";

describe("CadConsoleComponent", () => {
	let component: CadConsoleComponent;
	let fixture: ComponentFixture<CadConsoleComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [CadConsoleComponent],
				imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, RouterTestingModule],
				providers: [provideMockStore({initialState})]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(CadConsoleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
