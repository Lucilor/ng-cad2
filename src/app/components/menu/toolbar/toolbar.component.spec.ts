import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {ToolbarComponent} from "./toolbar.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@app/store/state";
import {MatMenuModule} from "@angular/material/menu";
import {RouterTestingModule} from "@angular/router/testing";

describe("ToolbarComponent", () => {
	let component: ToolbarComponent;
	let fixture: ComponentFixture<ToolbarComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [ToolbarComponent],
				imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, RouterTestingModule, MatMenuModule],
				providers: [provideMockStore({initialState})]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(ToolbarComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
