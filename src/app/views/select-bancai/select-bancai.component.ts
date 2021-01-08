import {ChangeDetectorRef, Component, OnInit} from "@angular/core";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MatAutocompleteSelectedEvent} from "@angular/material/autocomplete";
import {MatDialog} from "@angular/material/dialog";
import {ActivatedRoute} from "@angular/router";
import {openSelectBancaiCadsDialog} from "@src/app/components/dialogs/select-bancai-cads/select-bancai-cads.component";
import {BancaiList, BancaiCad, CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {ObjectOf} from "@src/app/utils";
import {NgxUiLoaderService} from "ngx-ui-loader";

const houduPattern = /^[0-9]+([.]{1}[0-9]+){0,1}$/;
const guigePattern = /^([0-9]+([.]{1}[0-9]+){0,1})[^0-9^.]+([0-9]+([.]{1}[0-9]+){0,1})$/;

export interface BancaiCadExtend extends BancaiCad {
    checked: boolean;
    oversized: boolean;
    disabled: boolean;
}

@Component({
    selector: "app-select-bancai",
    templateUrl: "./select-bancai.component.html",
    styleUrls: ["./select-bancai.component.scss"]
})
export class SelectBancaiComponent implements OnInit {
    sortedCads: BancaiCadExtend[][] = [];
    bancaiForms: FormGroup[] = [];
    bancaiList: ObjectOf<BancaiList> = {};
    formIdx = -1;
    codes: string[] = [];
    table = "";

    get currList(): BancaiList {
        const form = this.bancaiForms[this.formIdx];
        if (form) {
            return this.bancaiList[form.get("mingzi")?.value];
        } else {
            return {mingzi: "", cailiaoList: [], houduList: [], guigeList: []};
        }
    }

    get valid() {
        return this.bancaiForms.every((v) => v.valid && !v.get("oversized")?.value);
    }

    constructor(
        private route: ActivatedRoute,
        private dataService: CadDataService,
        private message: MessageService,
        private formBuilder: FormBuilder,
        private dialog: MatDialog,
        private cd: ChangeDetectorRef,
        private loader: NgxUiLoaderService
    ) {}

    async ngOnInit() {
        const {codes, table} = this.route.snapshot.queryParams;
        if (codes && table) {
            this.loader.startLoader("bancaiLoader");
            this.codes = codes.split(",");
            this.table = table;
            const result = await this.dataService.getBancais(this.codes);
            this.loader.stopLoader("bancaiLoader");
            if (result) {
                result.bancaiCads.forEach((cad) => {
                    const list = result.bancaiList.find((v) => v.mingzi === cad.bancai.mingzi);
                    if (list) {
                        this.bancaiList[list.mingzi] = list;
                        if (!cad.bancai.cailiao) {
                            cad.bancai.cailiao = list.cailiaoList[0];
                        }
                        if (!cad.bancai.houdu) {
                            cad.bancai.houdu = list.houduList[0];
                        }
                        if (!cad.bancai.guige) {
                            cad.bancai.guige = list.guigeList[0].slice();
                        }
                    }
                });
                this.updateSortedCads(result.bancaiCads);
                this.updateBancaiForms();
            }
        } else {
            this.message.alert("缺少参数");
        }
    }

    getBancaiCadExtend(bancaiCad: BancaiCad) {
        const result: BancaiCadExtend = {...bancaiCad, checked: false, oversized: false, disabled: false};
        const guige = bancaiCad.bancai.guige;
        if (Array.isArray(guige)) {
            result.oversized = bancaiCad.width > guige[0] || bancaiCad.height > guige[1];
        }
        return result;
    }

    isBancaiDuplicate(a: BancaiCad["bancai"], b: BancaiCad["bancai"]) {
        return (
            a.mingzi === b.mingzi &&
            a.cailiao === b.cailiao &&
            a.houdu === b.houdu &&
            a.guige?.[0] === b.guige?.[0] &&
            a.guige?.[1] === b.guige?.[1]
        );
    }

    updateSortedCads(bancaiCads: FormGroup | BancaiCad[]) {
        const sortedCads = this.sortedCads;
        if (Array.isArray(bancaiCads)) {
            sortedCads.length = 0;
            bancaiCads.forEach((bancaiCad) => {
                const bancai = bancaiCad.bancai;
                if (sortedCads.length) {
                    const index = sortedCads.findIndex((group) => {
                        if (group.length) {
                            const groupBancai = group[0].bancai;
                            return this.isBancaiDuplicate(bancai, groupBancai);
                        }
                        return true;
                    });
                    if (index > -1) {
                        sortedCads[index].push(this.getBancaiCadExtend(bancaiCad));
                    } else {
                        sortedCads.push([this.getBancaiCadExtend(bancaiCad)]);
                    }
                } else {
                    sortedCads.push([this.getBancaiCadExtend(bancaiCad)]);
                }
            });
        } else {
            const bancai: Partial<BancaiCad["bancai"]> = {};
            const mingzi = bancaiCads.get("mingzi");
            if (mingzi && !mingzi.errors) {
                bancai.mingzi = mingzi.value;
            }
            const cailiao = bancaiCads.get("cailiao");
            if (cailiao && !cailiao.errors) {
                bancai.cailiao = cailiao.value;
            }
            const houdu = bancaiCads.get("houdu");
            if (houdu && !houdu.errors) {
                bancai.houdu = Number(houdu.value);
            }
            const guige = bancaiCads.get("guige");
            if (guige && !guige.errors) {
                const match = (guige.value as string).match(guigePattern);
                if (match) {
                    bancai.guige = [Number(match[1]), Number(match[3])];
                }
            }
            const group = sortedCads[this.formIdx];
            group.forEach((v) => {
                Object.assign(v.bancai, bancai);
                if (Array.isArray(v.bancai.guige)) {
                    v.oversized = v.width > v.bancai.guige[0] || v.height > v.bancai.guige[1];
                } else {
                    v.oversized = false;
                }
            });
            bancaiCads.get("oversized")?.setValue(group.some((v) => v.oversized));
            const duplicateIdx = sortedCads.findIndex((v, i) => i !== this.formIdx && this.isBancaiDuplicate(v[0].bancai, group[0].bancai));
            if (duplicateIdx >= 0) {
                sortedCads[duplicateIdx] = sortedCads[duplicateIdx].concat(group);
                sortedCads.splice(this.formIdx, 1);
                this.bancaiForms.splice(this.formIdx, 1);
                this.formIdx = -1;
                this.message.snack("板材信息相同, 已合并");
            }
        }
    }

    updateBancaiForms() {
        const bancaiForms = this.bancaiForms;
        bancaiForms.length = 0;
        this.sortedCads.forEach((group) => {
            const bancai = group[0].bancai;
            const form = this.formBuilder.group({
                mingzi: bancai.mingzi,
                cailiao: [bancai.cailiao || "", Validators.required],
                houdu: [bancai.houdu?.toString() || "", [Validators.required, Validators.pattern(houduPattern)]],
                guige: [bancai.guige?.join(" × ") || "", [Validators.required, Validators.pattern(guigePattern)]],
                cads: group.map((v) => v.id).join(","),
                oversized: group.some((v) => v.oversized)
            });
            bancaiForms.push(form);
            form.updateValueAndValidity();
            form.markAllAsTouched();
            this.cd.detectChanges();
        });
    }

    getCailiaoError(index: number) {
        const control = this.bancaiForms[index].get("cailiao");
        if (control) {
            if (control.hasError("required")) {
                return "材料不能为空";
            }
        }
        return "";
    }

    getHouduError(index: number) {
        const control = this.bancaiForms[index].get("houdu");
        if (control) {
            if (control.hasError("required")) {
                return "厚度不能为空";
            } else if (control.hasError("pattern")) {
                return "厚度必须为数字";
            }
        }
        return "";
    }

    getGuigeError(index: number) {
        const control = this.bancaiForms[index].get("guige");
        if (control) {
            if (control.hasError("required")) {
                return "规格不能为空";
            } else if (control.hasError("pattern")) {
                return "规格必须为两个数字(如: 10,10)";
            }
        }
        return "";
    }

    selectValue(event: MatAutocompleteSelectedEvent, field: string) {
        const form = this.bancaiForms[this.formIdx];
        form.get(field)?.setValue(event.option.value);
        this.updateSortedCads(form);
    }

    async openCadsDialog(index: number) {
        const cads = this.sortedCads[index];
        const result = await openSelectBancaiCadsDialog(this.dialog, {data: {cads}});
        if (result && result.length) {
            const oldGroup: BancaiCadExtend[] = [];
            const newGroup: BancaiCadExtend[] = [];
            cads.forEach((cad) => {
                if (result.includes(cad.id)) {
                    cad.bancai.cailiao = null;
                    cad.bancai.houdu = null;
                    cad.bancai.guige = null;
                    newGroup.push(cad);
                } else {
                    oldGroup.push(cad);
                }
            });
            if (oldGroup.length) {
                this.sortedCads[index] = oldGroup;
            } else {
                this.sortedCads.splice(index, 1);
            }
            this.sortedCads.push(newGroup);
            this.updateBancaiForms();
        }
    }

    async submit() {
        const bancaiCads: BancaiCad[] = this.sortedCads
            .map((group) =>
                group
                    .filter((v) => !v.disabled)
                    .map((v) => {
                        const clone = {...v} as Partial<BancaiCadExtend>;
                        delete clone.checked;
                        delete clone.oversized;
                        delete clone.disabled;
                        return clone as BancaiCad;
                    })
            )
            .flat();
        this.loader.startLoader("submitLoader");
        const result = await this.dataService.jiguangkailiaopaiban(this.codes, bancaiCads, this.table);
        this.loader.stopLoader("submitLoader");
        if (result) {
            open(result);
        }
    }
}
