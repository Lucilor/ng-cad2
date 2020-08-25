import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {SubCadsComponent} from "./sub-cads.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer-legacy";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatMenuModule} from "@angular/material/menu";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatButtonModule} from "@angular/material/button";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {RouterTestingModule} from "@angular/router/testing";

describe("SubCadsComponent", () => {
	let component: SubCadsComponent;
	let fixture: ComponentFixture<SubCadsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [SubCadsComponent],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				MatMenuModule,
				MatSlideToggleModule,
				PerfectScrollbarModule,
				MatExpansionModule,
				MatButtonModule,
				BrowserAnimationsModule,
				RouterTestingModule
			],
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
