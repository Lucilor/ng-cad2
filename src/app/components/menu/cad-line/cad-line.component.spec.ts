import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {CadLineComponent} from "./cad-line.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ColorPickerModule} from "@syncfusion/ej2-angular-inputs";
import {MatSelectModule} from "@angular/material/select";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {RouterTestingModule} from "@angular/router/testing";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@app/store/state";
import {MatButtonModule} from "@angular/material/button";

describe("CadLineComponent", () => {
	let component: CadLineComponent;
	let fixture: ComponentFixture<CadLineComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [CadLineComponent],
			imports: [
				MatFormFieldModule,
				MatInputModule,
				BrowserAnimationsModule,
				FormsModule,
				ReactiveFormsModule,
				MatFormFieldModule,
				ColorPickerModule,
				MatSelectModule,
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				RouterTestingModule,
				MatButtonModule
			],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
