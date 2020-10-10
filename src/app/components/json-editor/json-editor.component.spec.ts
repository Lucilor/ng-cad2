import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {JsonEditorComponent} from "./json-editor.component";
import {JsonEditorComponent as JsonEditorComponent2} from "ang-jsoneditor";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from "@angular/material/dialog";

describe("JsonEditorComponent", () => {
	let component: JsonEditorComponent;
	let fixture: ComponentFixture<JsonEditorComponent>;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [JsonEditorComponent, JsonEditorComponent2],
			imports: [MatDialogModule],
			providers: [
				{provide: MatDialogRef, useValue: {}},
				{provide: MAT_DIALOG_DATA, useValue: {}}
			]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(JsonEditorComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
