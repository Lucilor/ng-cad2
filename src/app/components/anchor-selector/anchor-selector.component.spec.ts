import {ComponentFixture, TestBed} from "@angular/core/testing";

import {AnchorSelectorComponent} from "./anchor-selector.component";

describe("AnchorSelectorComponent", () => {
	let component: AnchorSelectorComponent;
	let fixture: ComponentFixture<AnchorSelectorComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [AnchorSelectorComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(AnchorSelectorComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
