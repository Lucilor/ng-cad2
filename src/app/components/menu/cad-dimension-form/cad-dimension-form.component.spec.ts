import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {CadDimensionFormComponent} from "./cad-dimension-form.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatButtonModule} from "@angular/material/button";

describe("CadDimensionFormComponent", () => {
	let component: CadDimensionFormComponent;
	let fixture: ComponentFixture<CadDimensionFormComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [CadDimensionFormComponent],
				imports: [
					FormsModule,
					ReactiveFormsModule,
					MatInputModule,
					MatSelectModule,
					BrowserAnimationsModule,
					MatFormFieldModule,
					MatInputModule,
					MatButtonModule
				],
				providers: [
					{provide: MatDialogRef, useValue: {}},
					{provide: MAT_DIALOG_DATA, useValue: {}}
				]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(CadDimensionFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
