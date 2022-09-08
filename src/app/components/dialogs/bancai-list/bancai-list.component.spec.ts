import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatRadioModule} from "@angular/material/radio";
import {MatTooltipModule} from "@angular/material/tooltip";
import {NgScrollbarModule} from "ngx-scrollbar";
import {BancaiListComponent, BancaiListData} from "./bancai-list.component";

const data: BancaiListData = {
    list: [
        {mingzi: "test", cailiaoList: ["1"], houduList: ["2"], guigeList: [[100, 100]]},
        {mingzi: "test2", cailiaoList: ["1"], houduList: ["2"], guigeList: [[100, 100]]}
    ],
    selectMode: "single",
    checkedItems: ["test"]
};

describe("BancaiListComponent", () => {
    let component: BancaiListComponent;
    let fixture: ComponentFixture<BancaiListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BancaiListComponent],
            imports: [MatRadioModule, MatTooltipModule, NgScrollbarModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BancaiListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
