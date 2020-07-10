import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadOptionsComponent} from "./cad-options.component";
import {provideMockStore} from "@ngrx/store/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {initialState} from "@src/app/store/state";

describe("CadOptionsComponent", () => {
	let component: CadOptionsComponent;
	let fixture: ComponentFixture<CadOptionsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadOptionsComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule],
			providers: [provideMockStore({initialState}), {provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA, useValue: {}}]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadOptionsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
