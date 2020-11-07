import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadConsoleModule} from "@src/app/modules/cad-console/cad-console.module";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {TableModule} from "@src/app/modules/table/table.module";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {CadLineTjqzComponent} from "./cad-line-tjqz.component";

describe("CadLineTjqzComponent", () => {
    let component: CadLineTjqzComponent;
    let fixture: ComponentFixture<CadLineTjqzComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadLineTjqzComponent],
            imports: [CadConsoleModule, HttpModule, MessageModule, TableModule, NgxUiLoaderModule],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: {}}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadLineTjqzComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
