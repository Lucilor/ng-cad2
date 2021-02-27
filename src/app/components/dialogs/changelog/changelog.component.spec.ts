import {ComponentFixture, TestBed} from "@angular/core/testing";
import {MatDialogRef} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {ChangelogComponent} from "./changelog.component";

describe("ChangelogComponent", () => {
    let component: ChangelogComponent;
    let fixture: ComponentFixture<ChangelogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ChangelogComponent],
            imports: [MatDividerModule, PerfectScrollbarModule],
            providers: [{provide: MatDialogRef, useValue: {}}]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ChangelogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
