import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {OrderListComponent} from "./order-list.component";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";

describe("OrderListComponent", () => {
	let component: OrderListComponent;
	let fixture: ComponentFixture<OrderListComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [OrderListComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule],
			providers: [provideMockStore({initialState}), {provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA, useValue: {}}]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(OrderListComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
