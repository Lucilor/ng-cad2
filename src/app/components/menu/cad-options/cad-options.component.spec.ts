import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadOptionsComponent} from "./cad-options.component";
import {provideMockStore} from "@ngrx/store/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {initialState} from "@src/app/store/state";
import {MatPaginatorModule} from "@angular/material/paginator";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {ImageComponent} from "../../image/image.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {FormsModule} from "@angular/forms";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {RouterTestingModule} from "@angular/router/testing";

describe("CadOptionsComponent", () => {
	let component: CadOptionsComponent;
	let fixture: ComponentFixture<CadOptionsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadOptionsComponent, ImageComponent],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				MatPaginatorModule,
				BrowserAnimationsModule,
				PerfectScrollbarModule,
				MatFormFieldModule,
				MatInputModule,
				MatButtonModule,
				MatPaginatorModule,
				MatInputModule,
				FormsModule,
				RouterTestingModule
			],
			providers: [provideMockStore({initialState}), {provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA, useValue: {}}]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadOptionsComponent);
		component = fixture.componentInstance;
		component.data.data = new CadData();
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
