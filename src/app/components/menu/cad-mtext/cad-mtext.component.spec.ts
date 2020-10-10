import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {CadMtextComponent} from "./cad-mtext.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@app/store/state";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ColorPickerModule} from "@syncfusion/ej2-angular-inputs";
import {FormsModule} from "@angular/forms";
import {RouterTestingModule} from "@angular/router/testing";

describe("CadMtextComponent", () => {
	let component: CadMtextComponent;
	let fixture: ComponentFixture<CadMtextComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [CadMtextComponent],
				imports: [
					HttpClientTestingModule,
					MatDialogModule,
					MatSnackBarModule,
					MatFormFieldModule,
					MatInputModule,
					MatButtonModule,
					BrowserAnimationsModule,
					ColorPickerModule,
					FormsModule,
					RouterTestingModule
				],
				providers: [provideMockStore({initialState})]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(CadMtextComponent);
		component = fixture.componentInstance;
		component.data = component.cad.data;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
