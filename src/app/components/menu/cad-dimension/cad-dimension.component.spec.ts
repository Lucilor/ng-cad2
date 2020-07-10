import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadDimensionComponent} from "./cad-dimension.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";

describe("CadDimensionComponent", () => {
	let component: CadDimensionComponent;
	let fixture: ComponentFixture<CadDimensionComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadDimensionComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadDimensionComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		component.cad.setControls();
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
