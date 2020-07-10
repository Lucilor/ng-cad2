import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {ToolbarComponent} from "./toolbar.component";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";
import {RouterModule} from "@angular/router";
import {MatMenuModule} from "@angular/material/menu";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";

describe("ToolbarComponent", () => {
	let component: ToolbarComponent;
	let fixture: ComponentFixture<ToolbarComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ToolbarComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, RouterModule.forRoot([]), MatMenuModule],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ToolbarComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
