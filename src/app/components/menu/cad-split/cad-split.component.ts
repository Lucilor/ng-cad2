import {Component, OnDestroy, OnInit} from "@angular/core";
import {CadData} from "@cad-viewer";
import {Subscribed} from "@mixins/subscribed.mixin";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfig, AppConfigService} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusSplit} from "@services/cad-status";

@Component({
    selector: "app-cad-split",
    templateUrl: "./cad-split.component.html",
    styleUrls: ["./cad-split.component.scss"]
})
export class CadSplitComponent extends Subscribed() implements OnInit, OnDestroy {
    private _splitCadLock = false;

    constructor(private config: AppConfigService, private status: AppStatusService, private message: MessageService) {
        super();
    }

    ngOnInit() {
        let prevConfig: Partial<AppConfig> = {};
        this.subscribe(this.status.cadStatusEnter$, async (cadStatus) => {
            if (cadStatus instanceof CadStatusSplit) {
                prevConfig = this.config.setConfig("dragAxis", "xy", {sync: false});
                this.focus();
            }
        });
        this.subscribe(this.status.cadStatusExit$, async (cadStatus) => {
            if (cadStatus instanceof CadStatusSplit) {
                this.config.setConfig(prevConfig, {sync: false});
                this.blur();
            }
        });
        window.addEventListener("keydown", this._splitCad);
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        window.removeEventListener("keydown", this._splitCad);
    }

    private _splitCad = async ({key}: KeyboardEvent) => {
        if (key !== "Enter" || this._splitCadLock) {
            return;
        }
        const cadStatus = this.status.cadStatus;
        if (!(cadStatus instanceof CadStatusSplit)) {
            return;
        }
        const cad = this.status.cad;
        const entities = cad.selected();
        if (entities.length < 1) {
            return;
        }
        const data = cad.data;
        if (!data) {
            return;
        }
        this._splitCadLock = true;
        const name = await this.message.prompt({promptData: {placeholder: "请输入CAD的名称", value: "新建CAD"}});
        if (name === null) {
            this._splitCadLock = false;
            return;
        }
        const split = new CadData({name});
        split.conditions = [...data.conditions];
        split.options = {...data.options};
        split.type = data.type;
        split.entities = entities.clone(true);
        data.entities.separate(entities);
        data.components.data.push(split);
        try {
            data.directAssemble(split);
        } catch (error) {
            this.message.snack("快速装配失败: " + (error as Error).message);
            return;
        }
        await this.status.openCad(data);
        if (this.status.cadStatus instanceof CadStatusSplit) {
            await this.focus();
        }
        this._splitCadLock = false;
    };

    async focus() {
        const cad = this.status.cad;
        this.status.focus();
        cad.data.components.data.forEach((v) => this.status.blur(v.entities));
        await cad.render();
    }

    async blur() {
        const cad = this.status.cad;
        this.status.focus();
        await cad.render();
    }
}
