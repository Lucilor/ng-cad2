import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";

import {CadOptionsComponent} from "./cad-options.component";

describe("CadOptionsComponent", () => {
    let component: CadOptionsComponent;
    let fixture: ComponentFixture<CadOptionsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadOptionsComponent],
            imports: [
                FormsModule,
                HttpModule,
                MatIconModule,
                MatInputModule,
                MatFormFieldModule,
                MatPaginatorModule,
                MessageModule,
                NgScrollbarModule,
                SpinnerModule
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: {}}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadOptionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
