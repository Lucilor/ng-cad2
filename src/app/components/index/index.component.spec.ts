import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {IndexComponent} from "./index.component";
import {provideMockStore} from "@ngrx/store/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {MatMenuModule} from "@angular/material/menu";
import {initialState} from "@app/store/state";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";
import {CadLineComponent} from "../menu/cad-line/cad-line.component";
import {CadMtextComponent} from "../menu/cad-mtext/cad-mtext.component";
import {CadDimensionComponent} from "../menu/cad-dimension/cad-dimension.component";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {MatExpansionModule} from "@angular/material/expansion";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {MatButtonModule} from "@angular/material/button";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabsModule} from "@angular/material/tabs";
import {CadPointsComponent} from "../menu/cad-points/cad-points.component";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatIconModule} from "@angular/material/icon";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {ColorPickerModule} from "@syncfusion/ej2-angular-inputs";
import {RouterTestingModule} from "@angular/router/testing";
import {CadConsoleComponent} from "../cad-console/cad-console.component";

describe("IndexComponent", () => {
	let component: IndexComponent;
	let fixture: ComponentFixture<IndexComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [
				IndexComponent,
				CadInfoComponent,
				CadLineComponent,
				CadMtextComponent,
				CadDimensionComponent,
				SubCadsComponent,
				ToolbarComponent,
				CadPointsComponent,
				CadConsoleComponent
			],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				MatMenuModule,
				PerfectScrollbarModule,
				MatExpansionModule,
				BrowserAnimationsModule,
				MatButtonModule,
				MatSlideToggleModule,
				MatTabsModule,
				MatAutocompleteModule,
				MatIconModule,
				FormsModule,
				ReactiveFormsModule,
				MatFormFieldModule,
				MatInputModule,
				MatSelectModule,
				ColorPickerModule,
				RouterTestingModule
			],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(IndexComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
