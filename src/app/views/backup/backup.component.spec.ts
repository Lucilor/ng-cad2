import {NgxMatDatetimePickerModule, NgxMatNativeDateModule} from "@angular-material-components/datetime-picker";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {CadData} from "@cad-viewer";
import {HttpModule} from "@modules/http/http.module";
import {ImageModule} from "@modules/image/image.module";
import {MessageModule} from "@modules/message/message.module";
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
                MatIconModule,
                MatInputModule,
                MatPaginatorModule,
                MessageModule,
                NgxMatDatetimePickerModule,
                NgxMatNativeDateModule,
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
