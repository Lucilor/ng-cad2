import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {PrintCadComponent} from "./print-cad.component";
import {ImageComponent} from "../image/image.component";

describe("PrintCadComponent", () => {
	let component: PrintCadComponent;
	let fixture: ComponentFixture<PrintCadComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [PrintCadComponent, ImageComponent]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(PrintCadComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
