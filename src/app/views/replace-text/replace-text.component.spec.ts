import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {MatCardModule} from "@angular/material/card";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {HttpModule} from "@modules/http/http.module";
import {MessageModule} from "@modules/message/message.module";
import {SpinnerModule} from "@modules/spinner/spinner.module";
import {NgScrollbarModule} from "ngx-scrollbar";
import {ReplaceTextComponent} from "./replace-text.component";

describe("ReplaceTextComponent", () => {
    let component: ReplaceTextComponent;
    let fixture: ComponentFixture<ReplaceTextComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ReplaceTextComponent],
            imports: [
                MatCardModule,
                MatCheckboxModule,
                MatInputModule,
                MatFormFieldModule,
                MatSelectModule,
                HttpModule,
                MessageModule,
                NgScrollbarModule,
                ReactiveFormsModule,
                SpinnerModule
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ReplaceTextComponent);
        component = fixture.componentInstance;
        component.form.controls.replaceFrom.setValue("aaa");
        component.form.controls.replaceTo.setValue("bbb");
        component.toBeReplacedList = [{id: "123", name: "345", matchedTexts: ["123", "321"], checked: true}];
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
