import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {IndexComponent} from "./index.component";
import {provideMockStore} from "@ngrx/store/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {MatMenuModule} from "@angular/material/menu";
import {initialState} from "@src/app/store/state";
import {CadInfoComponent} from "../menu/cad-info/cad-info.component";
import {CadLineComponent} from "../menu/cad-line/cad-line.component";
import {CadMtextComponent} from "../menu/cad-mtext/cad-mtext.component";
import {CadDimensionComponent} from "../menu/cad-dimension/cad-dimension.component";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {MatExpansionModule} from "@angular/material/expansion";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {SubCadsComponent} from "../menu/sub-cads/sub-cads.component";
import {ToolbarComponent} from "../menu/toolbar/toolbar.component";
import {RouterModule} from "@angular/router";
import {MatButtonModule} from "@angular/material/button";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTabsModule} from "@angular/material/tabs";
import {CadPointsComponent} from "../menu/cad-points/cad-points.component";

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
				CadPointsComponent
			],
			imports: [
				HttpClientTestingModule,
				MatDialogModule,
				MatSnackBarModule,
				MatMenuModule,
				PerfectScrollbarModule,
				MatExpansionModule,
				BrowserAnimationsModule,
				RouterModule.forRoot([]),
				MatButtonModule,
				MatSlideToggleModule,
				MatTabsModule
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
