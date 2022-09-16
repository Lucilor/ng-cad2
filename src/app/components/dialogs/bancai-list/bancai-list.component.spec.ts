import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatRadioModule} from "@angular/material/radio";
import {MatTooltipModule} from "@angular/material/tooltip";
import {HttpModule} from "@modules/http/http.module";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {BancaiListComponent, BancaiListInput} from "./bancai-list.component";

const bancais: BancaiList[] = [
    {mingzi: "test", cailiaoList: ["1"], houduList: ["2"], guigeList: [[100, 100]]},
    {mingzi: "test2", cailiaoList: ["1"], houduList: ["2"], guigeList: [[100, 100]]}
];
const data: BancaiListInput = {
    list: bancais,
    checkedItem: bancais[0]
};

describe("BancaiListComponent", () => {
    let component: BancaiListComponent;
    let fixture: ComponentFixture<BancaiListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BancaiListComponent],
            imports: [HttpModule, InputModule, MatRadioModule, MatTooltipModule, MessageModule, NgScrollbarModule],
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
