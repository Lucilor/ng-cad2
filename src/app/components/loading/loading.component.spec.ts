import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {LoadingComponent} from "./loading.component";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "@src/app/store/state";

describe("LoadingComponent", () => {
	let component: LoadingComponent;
	let fixture: ComponentFixture<LoadingComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [LoadingComponent],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(LoadingComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
