import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {CadOptionsComponent} from "./cad-options.component";

describe("CadOptionsComponent", () => {
    let component: CadOptionsComponent;
    let fixture: ComponentFixture<CadOptionsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadOptionsComponent],
            imports: [
                FormsModule,
                MatIconModule,
                MatInputModule,
                MatFormFieldModule,
                MatPaginatorModule,
                HttpModule,
                MessageModule,
                PerfectScrollbarModule,
                NgxUiLoaderModule
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
