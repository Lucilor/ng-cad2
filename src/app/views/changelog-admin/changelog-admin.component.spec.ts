import {ComponentFixture, TestBed} from "@angular/core/testing";
import {RouterTestingModule} from "@angular/router/testing";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {ChangelogAdminComponent} from "./changelog-admin.component";

describe("ChangelogAdminComponent", () => {
    let component: ChangelogAdminComponent;
    let fixture: ComponentFixture<ChangelogAdminComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ChangelogAdminComponent],
            imports: [HttpModule, MessageModule, PerfectScrollbarModule, RouterTestingModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ChangelogAdminComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
