import {ComponentFixture, TestBed} from "@angular/core/testing";

import {PrintA4A015PreviewComponent} from "./print-a4-a015-preview.component";

describe("PrintA4A015PreviewComponent", () => {
	let component: PrintA4A015PreviewComponent;
	let fixture: ComponentFixture<PrintA4A015PreviewComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [PrintA4A015PreviewComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(PrintA4A015PreviewComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
