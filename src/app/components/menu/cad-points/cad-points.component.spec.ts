import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {CadPointsComponent} from "./cad-points.component";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@app/store/state";

describe("CadPointsComponent", () => {
	let component: CadPointsComponent;
	let fixture: ComponentFixture<CadPointsComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [CadPointsComponent],
				providers: [provideMockStore({initialState})]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(CadPointsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
