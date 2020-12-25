import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatExpansionModule} from "@angular/material/expansion";
import {RouterTestingModule} from "@angular/router/testing";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {CadZhankaiComponent} from "./cad-zhankai.component";

describe("CadZhankaiComponent", () => {
    let component: CadZhankaiComponent;
    let fixture: ComponentFixture<CadZhankaiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadZhankaiComponent],
            imports: [MatExpansionModule, MessageModule, PerfectScrollbarModule, RouterTestingModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: []}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadZhankaiComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
