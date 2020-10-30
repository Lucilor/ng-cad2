import {ComponentFixture, TestBed} from "@angular/core/testing";

import {CadLineTjqzSelectComponent} from "./cad-line-tjqz-select.component";

describe("CadLineTjqzSelectComponent", () => {
	let component: CadLineTjqzSelectComponent;
	let fixture: ComponentFixture<CadLineTjqzSelectComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CadLineTjqzSelectComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineTjqzSelectComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
