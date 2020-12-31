import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {BackupComponent} from "./backup.component";

describe("BackupComponent", () => {
    let component: BackupComponent;
    let fixture: ComponentFixture<BackupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BackupComponent],
            imports: [MatButtonModule, MatCardModule, HttpModule, MessageModule, PerfectScrollbarModule, NgxUiLoaderModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BackupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
