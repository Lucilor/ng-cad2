import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {IndexComponent} from "./index.component";
import {provideMockStore} from "@ngrx/store/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {MatMenuModule} from "@angular/material/menu";
import {initialState} from "@src/app/store/state";

describe("IndexComponent", () => {
	let component: IndexComponent;
	let fixture: ComponentFixture<IndexComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [IndexComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, MatMenuModule],
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
