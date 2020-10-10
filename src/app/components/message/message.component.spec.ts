import {ComponentFixture, TestBed, waitForAsync} from "@angular/core/testing";

import {MessageComponent} from "./message.component";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";

describe("MessageComponent", () => {
	let component: MessageComponent;
	let fixture: ComponentFixture<MessageComponent>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [MessageComponent],
				imports: [MatFormFieldModule, MatInputModule, MatButtonModule],
				providers: [
					{provide: MatDialogRef, useValue: {}},
					{provide: MAT_DIALOG_DATA, useValue: {}}
				]
			}).compileComponents();
		})
	);

	beforeEach(() => {
		fixture = TestBed.createComponent(MessageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
