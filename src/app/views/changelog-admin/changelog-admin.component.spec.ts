import {NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule} from "@angular-material-components/datetime-picker";
import {DragDropModule} from "@angular/cdk/drag-drop";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {LoaderInlineComponent} from "@components/loader-inline/loader-inline.component";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";
import {ChangelogAdminComponent} from "./changelog-admin.component";

describe("ChangelogAdminComponent", () => {
    let component: ChangelogAdminComponent;
    let fixture: ComponentFixture<ChangelogAdminComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ChangelogAdminComponent, LoaderInlineComponent],
            imports: [
                DragDropModule,
                HttpModule,
                FormsModule,
                MatButtonModule,
                MatDatepickerModule,
                MatIconModule,
                MatInputModule,
                MatFormFieldModule,
                MatExpansionModule,
                MatPaginatorModule,
                MatSelectModule,
                MessageModule,
                NgScrollbarModule,
                NgxMatDatetimePickerModule,
                NgxMatTimepickerModule,
                NgxMatNativeDateModule,
                NgxUiLoaderModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ChangelogAdminComponent);
        component = fixture.componentInstance;
        component.changelog = [{timeStamp: new Date().getTime(), content: [{type: "feat", items: ["1", "2"]}]}];
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
