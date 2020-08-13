import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadLineComponent} from "./cad-line.component";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ColorPickerModule} from "@syncfusion/ej2-angular-inputs";
import {MatSelectModule} from "@angular/material/select";

describe("CadLineComponent", () => {
	let component: CadLineComponent;
	let fixture: ComponentFixture<CadLineComponent>;

	beforeEach(async(() => {
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
				MatSelectModule
			]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		component.cad.setControls();
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
