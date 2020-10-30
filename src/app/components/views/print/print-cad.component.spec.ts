import {ComponentFixture, TestBed} from "@angular/core/testing";

import {PrintCadComponent} from "./print-cad.component";

describe("PrintCADComponent", () => {
	let component: PrintCadComponent;
	let fixture: ComponentFixture<PrintCadComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [PrintCadComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PrintCadComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
