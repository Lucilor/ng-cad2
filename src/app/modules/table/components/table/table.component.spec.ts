import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatTableModule} from "@angular/material/table";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {TableComponent} from "./table.component";

describe("TableComponent", () => {
    let component: TableComponent<any>;
    let fixture: ComponentFixture<TableComponent<any>>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TableComponent],
            imports: [MatCheckboxModule, MatTableModule, MessageModule, PerfectScrollbarModule]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
