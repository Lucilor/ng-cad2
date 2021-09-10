import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {MAT_TOOLTIP_DEFAULT_OPTIONS} from "@angular/material/tooltip";
import {LoaderInlineComponent} from "@components/loader-inline/loader-inline.component";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";
import {CadListComponent, CadListData, customTooltipOptions} from "./cad-list.component";

const data: CadListData = {selectMode: "multiple", collection: "cad"};
describe("CadListComponent", () => {
    let component: CadListComponent;
    let fixture: ComponentFixture<CadListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CadListComponent, LoaderInlineComponent],
            imports: [
                FormsModule,
                MatCheckboxModule,
                MatDividerModule,
                MatIconModule,
                MatInputModule,
                MatFormFieldModule,
                MatSelectModule,
                MatSlideToggleModule,
                MatPaginatorModule,
                HttpModule,
                MessageModule,
                NgxUiLoaderModule,
                PerfectScrollbarModule
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data},
                {provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: customTooltipOptions}
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
