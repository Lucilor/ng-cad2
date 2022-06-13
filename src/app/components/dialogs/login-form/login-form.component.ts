import {HttpClient} from "@angular/common/http";
import {AfterViewInit, Component, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {getFormControl, getFormGroup} from "@app/app.common";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {ObjectOf} from "@utils";
import md5 from "md5";
import {ReCaptchaV3Service} from "ng-recaptcha";
import {lastValueFrom} from "rxjs";
import {getOpenDialogFunc} from "../dialog.common";

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
export class LoginFormComponent implements AfterViewInit {
    form = getFormGroup({
        user: getFormControl(""),
        password: getFormControl("")
    });
    passwordVisible = false;

    constructor(
        public dialogRef: MatDialogRef<LoginFormComponent, boolean>,
        @Inject(MAT_DIALOG_DATA) public data: LoginFormData,
        private recaptcha: ReCaptchaV3Service,
        private http: HttpClient,
        private message: MessageService,
        private spinner: SpinnerService
    ) {
        if (!this.data) {
            this.data = {project: {id: "?", name: "???"}, baseUrl: ""};
        }
    }

    ngAfterViewInit() {
        this.spinner.hide(this.spinner.defaultLoaderId);
    }

    async submit() {
        const form = this.form;
        if (form.untouched) {
            form.markAllAsTouched();
        }
        if (!form.valid) {
            return;
        }
        const token = await lastValueFrom(this.recaptcha.execute("submit"));
        const baseUrl = this.data.baseUrl;
        const data = new FormData();
        data.append("username", form.value.user || "");
        data.append("password", md5(form.value.password || ""));
        data.append("phonecode", "");
        data.append("recaptcha_token", token);
        this.spinner.show(this.spinner.defaultLoaderId);
        let response: ObjectOf<any> = await lastValueFrom(this.http.post(`${baseUrl}/login/in`, data));
        this.spinner.hide(this.spinner.defaultLoaderId);
        if (response.status === -1) {
            const phonecode = await this.message.prompt({
                title: "请输入验证码",
                promptData: {placeholder: "验证码"},
                cancelable: false
            });
            data.set("phonecode", phonecode || "");
            this.spinner.show(this.spinner.defaultLoaderId);
            response = await lastValueFrom(this.http.post(`${baseUrl}/login/in`, data));
            this.spinner.hide(this.spinner.defaultLoaderId);
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
