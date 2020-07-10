import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {PageNotFoundComponent} from "./page-not-found.component";
import {RouterModule} from "@angular/router";

describe("PageNotFoundComponent", () => {
	let component: PageNotFoundComponent;
	let fixture: ComponentFixture<PageNotFoundComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [PageNotFoundComponent],
			imports: [RouterModule.forRoot([])]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(PageNotFoundComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
