import {Component} from "@angular/core";
import {FormControl, FormGroupDirective, NgForm, ValidatorFn, Validators} from "@angular/forms";
import {ErrorStateMatcher} from "@angular/material/core";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {typedFormControl, TypedFormControl, typedFormGroup, TypedFormGroup} from "ngx-forms-typed";

interface Replacer {
    type: "全等于" | "在开头" | "在结尾" | "在中间";
    description: [string, string];
    regex: (str: string) => RegExp;
}

interface FormModel {
    replacer: Replacer;
    replaceFrom: string;
    replaceTo: string;
}

interface ToBeReplaced {
    id: string;
    name: string;
    matchedTexts: string[];
    checked: boolean;
}

@Component({
    selector: "app-replace-text",
    templateUrl: "./replace-text.component.html",
    styleUrls: ["./replace-text.component.scss"]
})
export class ReplaceTextComponent {
    replacers: Replacer[] = [
        {type: "全等于", description: ["全等于%s", "%s"], regex: (s) => new RegExp(`^${s}$`)},
        {type: "在开头", description: ["以%s开头", "%s"], regex: (s) => new RegExp(`^${s}`)},
        {type: "在结尾", description: ["以%结尾", "%s"], regex: (s) => new RegExp(`${s}$`)},
        {
            type: "在中间",
            description: ["%s在中间", "%s"],
            regex: (f) => new RegExp(`^(?!${f}).*${f}.*(?<!${f})$`)
        }
    ];
    form = typedFormGroup(
        {
            replacer: typedFormControl(this.replacers[0]),
            replaceFrom: typedFormControl("", Validators.required),
            replaceTo: typedFormControl("", Validators.required)
        },
        this.replaceStrValidator()
    ) as TypedFormGroup<FormModel>;
    get replacerDesc() {
        const replacer: Replacer = this.form.value.replacer;
        const {replaceFrom, replaceTo} = this.form.value;
        if (!replaceFrom || !replaceTo || replaceFrom === replaceTo) {
            return [];
        }
        const result = [...replacer.description];
        result[0] = result[0].replace("%s", `"${replaceFrom}"`);
        result[1] = result[1].replace("%s", `"${replaceTo}"`);
        return result;
    }
    toBeReplacedList: ToBeReplaced[] = [];

    constructor(private message: MessageService, private dataService: CadDataService, private status: AppStatusService) {}

    replaceStrValidator(): ValidatorFn {
        return () => {
            if (!this.form) {
                return null;
            }
            const {replaceFrom, replaceTo} = this.form.value;
            if (replaceFrom && replaceTo && replaceFrom === replaceTo) {
                return {equal: "两个字符串不能相等"};
            }
            return null;
        };
    }

    replaceStrErrorMatcher(): ErrorStateMatcher {
        return {
            isErrorState: (control: FormControl | null, form: FormGroupDirective | NgForm | null) =>
                !!((control && control.touched && control.invalid) || form?.hasError("equal"))
        };
    }

    getReplaceStrError(control: TypedFormControl<string>) {
        const errors = {...control.errors, ...this.form.errors};
        if (errors.equal) {
            return errors.equal;
        }
        if (errors.required) {
            return "字符串不能为空";
        }
    }

    async ready() {
        const form = this.form;
        if (form.untouched) {
            form.markAllAsTouched();
        }
        if (form.invalid) {
            return;
        }
        const yes = await this.message.confirm("是否确定替换？");
        if (!yes) {
            return;
        }
        const {replaceFrom, replaceTo, replacer} = form.value;
        const postData = {
            replaceFrom,
            replaceTo,
            regex: replacer.regex(replaceFrom).toString()
        };
        this.status.startLoader();
        const response = await this.dataService.post<ToBeReplaced[]>("peijian/cad/replaceTextReady", postData);
        this.status.stopLoader();
        if (response?.data) {
            if (response.data.length < 1) {
                this.message.alert("没有可替换的文本");
                return;
            }
            this.toBeReplacedList = response.data.map((v) => {
                v.checked = true;
                return v;
            });
        }
    }

    async submit() {
        const form = this.form;
        if (form.untouched) {
            form.markAllAsTouched();
        }
        if (form.invalid) {
            return;
        }
        const yes = await this.message.confirm("替换后无法恢复，是否确定替换？");
        if (!yes) {
            return;
        }
        const {replaceFrom, replaceTo, replacer} = form.value;
        const postData = {
            replaceFrom,
            replaceTo,
            regex: replacer.regex(replaceFrom).toString(),
            ids: this.toBeReplacedList.filter((v) => v.checked).map((v) => v.id)
        };
        this.status.startLoader();
        const response = await this.dataService.post<ToBeReplaced[]>("peijian/cad/replaceText", postData);
        this.status.stopLoader();
        if (response?.code === 0) {
            this.toBeReplacedList.length = 0;
        }
    }
}
