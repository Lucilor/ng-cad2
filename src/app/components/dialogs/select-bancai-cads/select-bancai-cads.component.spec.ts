import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {SelectBancaiCadsComponent} from "./select-bancai-cads.component";

describe("SelectBancaiCadsComponent", () => {
    let component: SelectBancaiCadsComponent;
    let fixture: ComponentFixture<SelectBancaiCadsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SelectBancaiCadsComponent],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: {}}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SelectBancaiCadsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
