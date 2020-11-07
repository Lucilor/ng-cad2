import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {CadListComponent} from "./cad-list.component";

describe("CadListComponent", () => {
    let component: CadListComponent;
    let fixture: ComponentFixture<CadListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadListComponent],
            imports: [
                FormsModule,
                MatInputModule,
                MatFormFieldModule,
                MatSelectModule,
                MatPaginatorModule,
                HttpModule,
                MessageModule,
                NgxUiLoaderModule
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: {}}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
