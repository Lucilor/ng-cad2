import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {CadData} from "@src/app/cad-viewer";
import {HttpModule} from "@src/app/modules/http/http.module";
import {ImageModule} from "@src/app/modules/image/image.module";
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
            imports: [
                FormsModule,
                HttpModule,
                ImageModule,
                MatButtonModule,
                MatCardModule,
                MatFormFieldModule,
                MatInputModule,
                MessageModule,
                NgxUiLoaderModule,
                PerfectScrollbarModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BackupComponent);
        component = fixture.componentInstance;
        const now = new Date();
        component.data = [{time: now.getTime(), title: now.toLocaleTimeString(), img: "", data: new CadData()}];
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
