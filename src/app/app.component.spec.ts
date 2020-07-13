import {TestBed, async} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {AppComponent} from "./app.component";
import {LoadingComponent} from "./components/loading/loading.component";
import {provideMockStore} from "@ngrx/store/testing";
import {initialState} from "./store/state";

describe("AppComponent", () => {
	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [AppComponent, LoadingComponent],
			imports: [RouterTestingModule],
			providers: [provideMockStore({initialState})]
		}).compileComponents();
	}));

	it("should create the app", () => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.componentInstance;
		expect(app).toBeTruthy();
	});

	// it(`should have as title 'ng-cad2'`, () => {
	// 	const fixture = TestBed.createComponent(AppComponent);
	// 	const app = fixture.componentInstance;
	// 	expect(app.title).toEqual("ng-cad2");
	// });

	// it("should render title", () => {
	// 	const fixture = TestBed.createComponent(AppComponent);
	// 	fixture.detectChanges();
	// 	const compiled = fixture.nativeElement;
	// 	expect(compiled.querySelector(".content span").textContent).toContain("ng-cad2 app is running!");
	// });
});
