import {ComponentFixture, TestBed} from "@angular/core/testing";

import {CadLineTjqzComponent} from "./cad-line-tjqz.component";

describe("CadLineTjqzComponent", () => {
	let component: CadLineTjqzComponent;
	let fixture: ComponentFixture<CadLineTjqzComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CadLineTjqzComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineTjqzComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
