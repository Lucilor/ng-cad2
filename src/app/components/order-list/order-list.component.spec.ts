import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {OrderListComponent} from "./order-list.component";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";
import {ImageComponent} from "../image/image.component";
import {MatButtonModule} from "@angular/material/button";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatTableModule} from "@angular/material/table";

describe("OrderListComponent", () => {
	let component: OrderListComponent;
	let fixture: ComponentFixture<OrderListComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [OrderListComponent, ImageComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, MatButtonModule, MatPaginatorModule, MatTableModule],
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
