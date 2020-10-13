import {ComponentFixture, TestBed} from "@angular/core/testing";

import {CadLineTiaojianquzhiSelectComponent} from "./cad-line-tiaojianquzhi-select.component";

describe("CadLineTiaojianquzhiSelectComponent", () => {
	let component: CadLineTiaojianquzhiSelectComponent;
	let fixture: ComponentFixture<CadLineTiaojianquzhiSelectComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CadLineTiaojianquzhiSelectComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineTiaojianquzhiSelectComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
