import {ComponentFixture, TestBed} from "@angular/core/testing";

import {CadConsoleComponent} from "./cad-console.component";

describe("CadConsoleComponent", () => {
	let component: CadConsoleComponent;
	let fixture: ComponentFixture<CadConsoleComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CadConsoleComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CadConsoleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
