import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {SubCadsComponent} from "./sub-cads.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatMenuModule} from "@angular/material/menu";

describe("SubCadsComponent", () => {
	let component: SubCadsComponent;
	let fixture: ComponentFixture<SubCadsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [SubCadsComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, MatMenuModule],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(SubCadsComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		component.cad.setControls();
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
