import {HttpClientModule} from "@angular/common/http";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {ReactiveFormsModule} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {MatInputModule} from "@angular/material/input";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MessageModule} from "@modules/message/message.module";
import {RecaptchaV3Module, RECAPTCHA_V3_SITE_KEY} from "ng-recaptcha";
import {NgxUiLoaderModule} from "ngx-ui-loader";
import {LoginFormComponent, LoginFormData} from "./login-form.component";

const data: LoginFormData = {project: {id: "test", name: "测试"}, baseUrl: ""};

describe("LoginFormComponent", () => {
    let component: LoginFormComponent;
    let fixture: ComponentFixture<LoginFormComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LoginFormComponent],
            imports: [
                BrowserAnimationsModule,
                HttpClientModule,
                MatFormFieldModule,
                MatIconModule,
                MatInputModule,
                MessageModule,
                NgxUiLoaderModule,
                ReactiveFormsModule,
                RecaptchaV3Module
            ],
            providers: [
                {provide: MatDialogRef, useValue: {}},
                {provide: MAT_DIALOG_DATA, useValue: data},
                {provide: RECAPTCHA_V3_SITE_KEY, useValue: ""}
            ]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(LoginFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
