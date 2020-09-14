import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadInfoComponent} from "./cad-info.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@app/cad-viewer/cad-data/cad-data";
import {StoreModule} from "@ngrx/store";
import {initialState} from "@app/store/state";
import {CadPointsComponent} from "../cad-points/cad-points.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {CadListComponent} from "../../cad-list/cad-list.component";
import {MatSelectModule} from "@angular/material/select";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {RouterTestingModule} from "@angular/router/testing";

describe("CadInfoComponent", () => {
	let component: CadInfoComponent;
	let fixture: ComponentFixture<CadInfoComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadInfoComponent, CadPointsComponent, CadListComponent],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				StoreModule.forRoot({}),
				MatFormFieldModule,
				MatInputModule,
				MatAutocompleteModule,
				MatSelectModule,
				BrowserAnimationsModule,
				FormsModule,
				ReactiveFormsModule,
				RouterTestingModule
			],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadInfoComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
