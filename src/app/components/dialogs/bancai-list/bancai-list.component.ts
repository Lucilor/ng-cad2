import {Component, Inject} from "@angular/core";
import {Validators} from "@angular/forms";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {BancaiList} from "@modules/http/services/cad-data.service.types";
import {InputInfo} from "@modules/input/components/types";
import {MessageService} from "@modules/message/services/message.service";
import {session, setGlobal} from "@src/app/app.common";
import {timeout} from "@utils";
import {debounce} from "lodash";
import {BehaviorSubject} from "rxjs";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-bancai-list",
    templateUrl: "./bancai-list.component.html",
    styleUrls: ["./bancai-list.component.scss"]
})
export class BancaiListComponent {
    checkedIndex = new BehaviorSubject<number>(-1);
    filterText = "";
    filterInputInfo: InputInfo = {
        type: "string",
        label: "搜索",
        model: {key: "filterText", data: this},
        autoFocus: true,
        onInput: debounce((v) => {
            this.filterList();
            this.saveFilterText();
        }, 500)
    };
    list: {bancai: BancaiList; hidden: boolean}[] = [];
    zidingyi = "";
    zidingyiIndex = -1;

    constructor(
        public dialogRef: MatDialogRef<BancaiListComponent, BancaiListOutput>,
        @Inject(MAT_DIALOG_DATA) public data: BancaiListInput,
        private message: MessageService
    ) {
        const {checkedItem, list} = this.data || {};
        if (checkedItem) {
            this.checkedIndex.next(list.findIndex((v) => checkedItem.mingzi === v.mingzi));
            this.zidingyi = checkedItem.zidingyi || "";
        }
        this.list = list.map((bancai) => ({bancai, hidden: false}));
        this.loadFilterText();
        this.filterList();
        setGlobal("bancai", this);
    }

    submit() {
        const i = this.checkedIndex.value;
        const bancai = {...this.data.list[i]};
        if (bancai.mingzi === "自定义") {
            bancai.zidingyi = this.zidingyi;
        }
        this.dialogRef.close(bancai);
    }

    cancel() {
        this.dialogRef.close();
    }

    filterList() {
        const text = this.filterText;
        this.zidingyiIndex = -1;
        for (const [i, item] of this.list.entries()) {
            item.hidden = !!text && !item.bancai.mingzi.includes(text);
            if (!item.hidden && item.bancai.mingzi === "自定义") {
                this.zidingyiIndex = i;
            }
        }
    }

    saveFilterText() {
        session.save("bancaiListSearchText", this.filterText);
    }

    loadFilterText() {
        this.filterText = session.load("bancaiListSearchText") || "";
    }

    async setCheckIndex(i: number) {
        const j = this.checkedIndex.value;
        const bancai = this.data.list[i];
        this.checkedIndex.next(i);
        if (bancai.mingzi === "自定义") {
            await timeout(0);
            const zidingyi = await this.message.prompt({
                title: "自定义板材",
                promptData: {placeholder: "自定义板材", value: this.zidingyi, validators: Validators.required}
            });
            if (zidingyi) {
                this.zidingyi = zidingyi;
            } else {
                this.checkedIndex.next(j);
            }
        }
    }

    selectZidingyi() {
        this.setCheckIndex(this.zidingyiIndex);
    }
}

export const openBancaiListDialog = getOpenDialogFunc<BancaiListComponent, BancaiListInput, BancaiListOutput>(BancaiListComponent, {
    width: "85%",
    height: "85%"
});

export interface BancaiListInput {
    list: BancaiList[];
    checkedItem?: BancaiList;
}

export type BancaiListOutput = BancaiList;
