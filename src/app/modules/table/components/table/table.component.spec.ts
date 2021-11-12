import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MatTableModule} from "@angular/material/table";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {TableComponent} from "./table.component";

describe("TableComponent", () => {
    let component: TableComponent<any>;
    let fixture: ComponentFixture<TableComponent<any>>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TableComponent],
            imports: [MatCheckboxModule, MatSlideToggleModule, MatTableModule, MessageModule, NgScrollbarModule]
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
