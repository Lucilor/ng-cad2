import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadMtextComponent} from "./cad-mtext.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {initialState} from "@src/app/store/state";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ColorPickerModule} from "@syncfusion/ej2-angular-inputs";
import {FormsModule} from "@angular/forms";

describe("CadMtextComponent", () => {
	let component: CadMtextComponent;
	let fixture: ComponentFixture<CadMtextComponent>;

	beforeEach(async(() => {
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
				FormsModule
			],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadMtextComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		component.data = component.cad.data;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
