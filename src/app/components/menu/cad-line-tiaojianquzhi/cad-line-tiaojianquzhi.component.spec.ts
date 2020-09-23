import {ComponentFixture, TestBed} from "@angular/core/testing";

import {CadLineTiaojianquzhiComponent} from "./cad-line-tiaojianquzhi.component";

describe("CadLineTiaojianquzhiComponent", () => {
	let component: CadLineTiaojianquzhiComponent;
	let fixture: ComponentFixture<CadLineTiaojianquzhiComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [CadLineTiaojianquzhiComponent]
		}).compileComponents();
	});

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineTiaojianquzhiComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
