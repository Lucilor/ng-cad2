import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadListComponent} from "./cad-list.component";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {provideMockStore} from "@ngrx/store/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {initialState} from "@src/app/store/state";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatTableModule} from "@angular/material/table";
import {FormsModule} from "@angular/forms";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";

describe("CadListComponent", () => {
	let component: CadListComponent;
	let fixture: ComponentFixture<CadListComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadListComponent],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				PerfectScrollbarModule,
				MatFormFieldModule,
				MatInputModule,
				MatButtonModule,
				MatPaginatorModule,
				MatTableModule,
				MatInputModule,
				FormsModule,
				BrowserAnimationsModule
			],
			providers: [provideMockStore({initialState}), {provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA, useValue: {}}]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
