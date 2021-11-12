import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatDividerModule} from "@angular/material/divider";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatPaginatorModule} from "@angular/material/paginator";
import {MatSelectModule} from "@angular/material/select";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";
import {SelectCadsComponent} from "./select-cads.component";

describe("SelectCadsComponent", () => {
    let component: SelectCadsComponent;
    let fixture: ComponentFixture<SelectCadsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SelectCadsComponent],
            imports: [
                BrowserAnimationsModule,
                MessageModule,
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
                NgScrollbarModule,
                NgxUiLoaderModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SelectCadsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
