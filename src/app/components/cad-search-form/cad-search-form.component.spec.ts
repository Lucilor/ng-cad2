import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadSearchFormComponent} from "./cad-search-form.component";
import {provideMockStore} from "@ngrx/store/testing";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {initialState} from "@app/store/state";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {FormsModule} from "@angular/forms";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {RouterTestingModule} from "@angular/router/testing";

describe("CadSearchFormComponent", () => {
	let component: CadSearchFormComponent;
	let fixture: ComponentFixture<CadSearchFormComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadSearchFormComponent],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				PerfectScrollbarModule,
				MatFormFieldModule,
				MatInputModule,
				MatButtonModule,
				MatPaginatorModule,
				MatSelectModule,
				MatInputModule,
				FormsModule,
				BrowserAnimationsModule,
				RouterTestingModule
			],
			providers: [provideMockStore({initialState}), {provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA, useValue: {}}]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadSearchFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
