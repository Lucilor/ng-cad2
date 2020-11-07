import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";

import {CadSearchFormComponent} from "./cad-search-form.component";

describe("CadSearchFormComponent", () => {
    let component: CadSearchFormComponent;
    let fixture: ComponentFixture<CadSearchFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadSearchFormComponent],
            imports: [
                FormsModule,
                MatButtonModule,
                MatCardModule,
                MatIconModule,
                MatInputModule,
                MatFormFieldModule,
                MatSelectModule,
                HttpModule,
                MessageModule,
                PerfectScrollbarModule
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: {}}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CadSearchFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
