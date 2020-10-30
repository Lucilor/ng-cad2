import {ComponentFixture, TestBed} from "@angular/core/testing";

import {CadSearchFormComponent} from "./cad-search-form.component";

describe("CadSearchFormComponent", () => {
	let component: CadSearchFormComponent;
	let fixture: ComponentFixture<CadSearchFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CadSearchFormComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CadSearchFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
