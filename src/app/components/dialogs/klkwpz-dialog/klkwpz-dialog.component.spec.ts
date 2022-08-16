import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCardModule} from "@angular/material/card";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {KlkwpzDialogComponent, KlkwpzDialogData} from "./klkwpz-dialog.component";

const data: KlkwpzDialogData = {data: new CadData({name: "test", info: {开料孔位配置: [{face: "123"}]}})};

describe("KlkwpzDialogComponent", () => {
    let component: KlkwpzDialogComponent;
    let fixture: ComponentFixture<KlkwpzDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [KlkwpzDialogComponent, KlkwpzComponent],
            imports: [HttpModule, InputModule, MatCardModule, MessageModule, NgScrollbarModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(KlkwpzDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
