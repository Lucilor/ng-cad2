import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCardModule} from "@angular/material/card";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {HttpModule} from "@modules/http/http.module";
import {InputModule} from "@modules/input/input.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import testData from "../../klkwpz/klkwpz.test.json";
import {KlkwpzDialogData, KlkwpzDialogComponent} from "./klkwpz-dialog.component";

const data: KlkwpzDialogData = {source: testData as any};

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
