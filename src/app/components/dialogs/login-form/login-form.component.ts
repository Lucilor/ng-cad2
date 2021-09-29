import {HttpClient} from "@angular/common/http";
import {Component, Inject, OnDestroy, OnInit} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MessageService} from "@modules/message/services/message.service";
import {ObjectOf} from "@utils";
import md5 from "md5";
import {ReCaptchaV3Service} from "ng-recaptcha";
import {typedFormGroup, typedFormControl, TypedFormGroup} from "ngx-forms-typed";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {getOpenDialogFunc} from "../dialog.common";

interface LoginForm {
    user: string;
    password: string;
}

export interface LoginFormData {
    project: {id: string; name: string};
    baseUrl: string;
}

export interface LoginResponse {
    status: number;
    msg: string;
    type: string;
}

@Component({
    selector: "app-login-form",
    templateUrl: "./login-form.component.html",
    styleUrls: ["./login-form.component.scss"]
})
export class LoginFormComponent implements OnInit, OnDestroy {
    form = typedFormGroup({
        user: typedFormControl(""),
        password: typedFormControl("")
    }) as TypedFormGroup<LoginForm>;
    passwordVisible = false;
    private _ngxLoaderDisplay = "";
    private get _masterLoader() {
        return document.querySelector("ngx-ui-loader[ng-reflect-loader-id='master']") as HTMLElement;
    }

    constructor(
        public dialogRef: MatDialogRef<LoginFormComponent, boolean>,
        @Inject(MAT_DIALOG_DATA) public data: LoginFormData,
        private recaptcha: ReCaptchaV3Service,
        private http: HttpClient,
        private message: MessageService,
        private loader: NgxUiLoaderService
    ) {
        if (!this.data) {
            this.data = {project: {id: "?", name: "???"}, baseUrl: ""};
        }
    }

    ngOnInit() {
        const loader = this._masterLoader;
        this._ngxLoaderDisplay = loader.style.display;
        loader.style.display = "none";
    }

    ngOnDestroy() {
        this._masterLoader.style.display = this._ngxLoaderDisplay;
    }

    async submit() {
        const form = this.form;
        if (form.untouched) {
            form.markAllAsTouched();
        }
        if (!form.valid) {
            return;
        }
        const token = await this.recaptcha.execute("submit").toPromise();
        const baseUrl = this.data.baseUrl;
        const data = new FormData();
        data.append("username", form.value.user);
        data.append("password", md5(form.value.password));
        data.append("phonecode", "");
        data.append("recaptcha_token", token);
        this.loader.start();
        let response: ObjectOf<any> = await this.http.post(`${baseUrl}/login/in`, data).toPromise();
        this.loader.stop();
        if (response.status === -1) {
            const phonecode = await this.message.prompt({
                title: "请输入验证码",
                promptData: {placeholder: "验证码"},
                cancelable: false
            });
            data.set("phonecode", phonecode);
            response = await this.http.post(`${baseUrl}/login/in`, data).toPromise();
        }
        if (response.status === 0) {
            this.message.alert(response.msg);
            this.dialogRef.close(false);
        } else if (response.code === 0) {
            this.message.snack(response.msg);
            this.dialogRef.close(true);
        } else {
            this.message.alert(response.msg);
            this.dialogRef.close(false);
        }
    }

    goToLoginPage() {
        open(`${this.data.baseUrl}signUp/index`);
    }

    togglePasswordVisible(event: Event) {
        this.passwordVisible = !this.passwordVisible;
        event.stopPropagation();
    }
}

export const openLoginFormDialog = getOpenDialogFunc<LoginFormComponent, LoginFormData, boolean>(LoginFormComponent);
