import {async, ComponentFixture, TestBed} from "@angular/core/testing";
import {TestComponent} from "./test.component";
import {provideMockStore} from "@ngrx/store/testing";
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {MatDialogModule} from "@angular/material/dialog";
import {MatSnackBarModule} from "@angular/material/snack-bar";
import {initialState} from "@src/app/store/state";

describe("TestComponent", () => {
	let component: TestComponent;
	let fixture: ComponentFixture<TestComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [TestComponent],
			imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(TestComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
