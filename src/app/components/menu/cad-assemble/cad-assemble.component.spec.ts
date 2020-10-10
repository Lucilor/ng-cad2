import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {CadAssembleComponent} from "./cad-assemble.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@app/store/state";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {FormsModule} from "@angular/forms";
import {MatSelectModule} from "@angular/material/select";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {RouterTestingModule} from "@angular/router/testing";

describe("CadAssembleComponent", () => {
	let component: CadAssembleComponent;
	let fixture: ComponentFixture<CadAssembleComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [CadAssembleComponent],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				PerfectScrollbarModule,
				MatFormFieldModule,
				MatInputModule,
				MatButtonModule,
				MatInputModule,
				FormsModule,
				MatSelectModule,
				BrowserAnimationsModule,
				RouterTestingModule
			],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadAssembleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
