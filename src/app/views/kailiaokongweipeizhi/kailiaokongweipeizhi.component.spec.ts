import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {MatMenuModule} from "@angular/material/menu";
import {MatSelectModule} from "@angular/material/select";
import {AnchorSelectorComponent} from "@src/app/components/anchor-selector/anchor-selector.component";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";
import {KailiaokongweipeizhiComponent} from "./kailiaokongweipeizhi.component";

describe("KailiaokongweipeizhiComponent", () => {
    let component: KailiaokongweipeizhiComponent;
    let fixture: ComponentFixture<KailiaokongweipeizhiComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [KailiaokongweipeizhiComponent, AnchorSelectorComponent],
            imports: [
                FormsModule,
                HttpModule,
                MatAutocompleteModule,
                MatExpansionModule,
                MatFormFieldModule,
                MatIconModule,
                MatInputModule,
                MatMenuModule,
                MatSelectModule,
                MessageModule,
                NgxUiLoaderModule,
                PerfectScrollbarModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(KailiaokongweipeizhiComponent);
        component = fixture.componentInstance;
        component.klkwpz.init({aaa: [{}]});
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
