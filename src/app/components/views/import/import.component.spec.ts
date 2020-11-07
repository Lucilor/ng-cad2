import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatDialogModule} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {ImportComponent} from "./import.component";

describe("ImportComponent", () => {
    let component: ImportComponent;
    let fixture: ComponentFixture<ImportComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportComponent],
            imports: [
                FormsModule,
                MatCardModule,
                MatDialogModule,
                MatFormFieldModule,
                MatInputModule,
                MatSlideToggleModule,
                HttpModule,
                MessageModule,
                NgxUiLoaderModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
