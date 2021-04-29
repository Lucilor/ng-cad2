import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@src/app/modules/http/http.module";
import {MessageModule} from "@src/app/modules/message/message.module";
import {PerfectScrollbarModule} from "ngx-perfect-scrollbar";
import {NgxUiLoaderModule} from "ngx-ui-loader";

import {ReplaceTextComponent} from "./replace-text.component";

describe("ReplaceTextComponent", () => {
    let component: ReplaceTextComponent;
    let fixture: ComponentFixture<ReplaceTextComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ReplaceTextComponent],
            imports: [
                FormsModule,
                MatCardModule,
                MatCheckboxModule,
                MatInputModule,
                MatFormFieldModule,
                MatSelectModule,
                HttpModule,
                MessageModule,
                NgxUiLoaderModule,
                PerfectScrollbarModule,
                ReactiveFormsModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ReplaceTextComponent);
        component = fixture.componentInstance;
        component.form.controls.replaceFrom.setValue("aaa");
        component.form.controls.replaceTo.setValue("bbb");
        // component.toBeReplacedList = [{id: "123", name: "345", matchedTexts: ["123", "321"], checked: true}];
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
