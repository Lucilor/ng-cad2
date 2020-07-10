import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadLineComponent} from "./cad-line.component";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";

describe("CadLineComponent", () => {
	let component: CadLineComponent;
	let fixture: ComponentFixture<CadLineComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadLineComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineComponent);
		component = fixture.componentInstance;
		component.cad = new CadViewer(new CadData());
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
