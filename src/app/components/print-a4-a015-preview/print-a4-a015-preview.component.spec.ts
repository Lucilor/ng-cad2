import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {PrintA4A015PreviewComponent} from "./print-a4-a015-preview.component";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@app/store/state";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {RouterTestingModule} from "@angular/router/testing";

describe("PrintA4A015PreviewComponent", () => {
	let component: PrintA4A015PreviewComponent;
	let fixture: ComponentFixture<PrintA4A015PreviewComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [PrintA4A015PreviewComponent],
				imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, RouterTestingModule],
				providers: [provideMockStore({initialState})]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(PrintA4A015PreviewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
