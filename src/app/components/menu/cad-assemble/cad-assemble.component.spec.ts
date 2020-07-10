import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadAssembleComponent} from "./cad-assemble.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {initialState} from "@src/app/store/state";

describe("CadAssembleComponent", () => {
	let component: CadAssembleComponent;
	let fixture: ComponentFixture<CadAssembleComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadAssembleComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadAssembleComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		component.cad.setControls();
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
