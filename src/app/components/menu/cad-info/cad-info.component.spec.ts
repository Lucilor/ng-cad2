import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadInfoComponent} from "./cad-info.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {StoreModule} from "@ngrx/store";
import {initialState} from "@src/app/store/state";
import {CadPointsComponent} from "../cad-points/cad-points.component";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";

describe("CadInfoComponent", () => {
	let component: CadInfoComponent;
	let fixture: ComponentFixture<CadInfoComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadInfoComponent, CadPointsComponent],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				StoreModule.forRoot({}),
				MatFormFieldModule,
				MatInputModule
			],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadInfoComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		component.cad.setControls();
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
