import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {ExpressionAnalysisComponent} from "./expression-analysis.component";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatButtonModule} from "@angular/material/button";
import {RouterTestingModule} from "@angular/router/testing";

describe("ExpressionAnalysisComponent", () => {
	let component: ExpressionAnalysisComponent;
	let fixture: ComponentFixture<ExpressionAnalysisComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ExpressionAnalysisComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, MatButtonModule, RouterTestingModule],
			providers: [provideMockStore({initialState}), {provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA, useValue: {}}]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ExpressionAnalysisComponent);
		component = fixture.componentInstance;
		component.data.cad = new CadData();
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
