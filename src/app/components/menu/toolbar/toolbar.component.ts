import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {local} from "@src/app/app.common";
import {CadMtext, CadLineLike, DEFAULT_LENGTH_TEXT_SIZE, sortLines} from "@src/app/cad-viewer";
import {Subscribed} from "@src/app/mixins/subscribed.mixin";
import {CadConsoleService} from "@src/app/modules/cad-console/services/cad-console.service";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfigService, AppConfig} from "@src/app/services/app-config.service";
import {CadStatusName, AppStatusService, cadStatusNameMap} from "@src/app/services/app-status.service";
import {ObjectOf, ValueOf} from "@src/app/utils";
import {flatMap} from "lodash";
import {openChangelogDialog} from "../../dialogs/changelog/changelog.component";

@Component({
    selector: "app-toolbar",
    templateUrl: "./toolbar.component.html",
    styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent extends Subscribed() implements OnInit, OnDestroy {
    openLock = false;
    keyMap: ObjectOf<() => void> = {
        s: () => this.save(),
        1: () => this.open("1"),
        2: () => this.open("2"),
        3: () => this.open("3"),
        4: () => this.open("4"),
        5: () => this.open("5"),
        g: () => this.assembleCads(),
        h: () => this.splitCad(),
        p: () => this.printCad(),
        q: () => this.newCad()
    };
    statusName: ValueOf<CadStatusName> = "普通";
    statusWithoutEsc: ValueOf<CadStatusName>[] = ["普通", "装配"];
    showNew = false;

    get isStatusNormal() {
        return this.statusName === "普通";
    }

    get canEsc() {
        return !this.statusWithoutEsc.includes(this.statusName);
    }

    onKeyDown = ((event: KeyboardEvent) => {
        const {ctrlKey} = event;
        const key = event.key.toLowerCase();
        if (ctrlKey && this.keyMap[key]) {
            event.preventDefault();
            this.clickBtn(key);
        } else if (key === "escape") {
            event.preventDefault();
            const name = this.statusName;
            if (!this.statusWithoutEsc.includes(name)) {
                this.backToNormal();
            }
        }
    }).bind(this);

    constructor(
        private console: CadConsoleService,
        private message: MessageService,
        private config: AppConfigService,
        private status: AppStatusService,
        private dialog: MatDialog,
        private dataService: CadDataService
    ) {
        super();
        (async () => {
            const timeStamp = Number(local.load("changelogTimestamp"));
            const {changelog} = await this.dataService.getChangelog(1, 1);
            if (changelog.length) {
                this.showNew = timeStamp < changelog[0].timeStamp;
            }
        })();
    }

    ngOnInit() {
        window.addEventListener("keydown", this.onKeyDown);
        this.subscribe(this.status.cadStatus$, ({name}) => (this.statusName = cadStatusNameMap[name]));
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        window.removeEventListener("keydown", this.onKeyDown);
    }

    getConfig(key: keyof AppConfig) {
        return this.config.config(key);
    }

    clickBtn(key: string) {
        this.keyMap[key]?.();
    }

    save() {
        this.console.execute("save");
    }

    open(collection: string) {
        this.console.execute("open", {collection});
    }

    flip(vertical: boolean, horizontal: boolean) {
        this.console.execute("flip", {vertical: vertical ? "true" : "false", horizontal: horizontal ? "true" : "false"});
    }

    async rotate(clockwise?: boolean) {
        let angle = 0;
        if (clockwise === undefined) {
            const input = await this.message.prompt({type: "number", placeholder: "输入角度"});
            if (input === false) {
                return;
            }
            angle = Number(input);
        } else {
            if (clockwise === true) {
                angle = 90;
            } else if (clockwise === false) {
                angle = -90;
            }
        }
        this.console.execute("rotate", {degrees: angle.toString()});
    }

    showManual() {
        this.console.execute("man");
    }

    showChangelog() {
        openChangelogDialog(this.dialog, {hasBackdrop: true});
        local.save("changelogTimestamp", new Date().getTime());
        this.showNew = false;
    }

    assembleCads() {
        this.console.execute("assemble");
    }

    splitCad() {
        this.console.execute("split");
    }

    toggleShowDimensions() {
        this.config.config("hideDimensions", !this.config.config("hideDimensions"));
    }

    toggleShowCadGongshis() {
        this.config.config("showCadGongshis", !this.config.config("showCadGongshis"));
    }

    toggleValidateLines() {
        const value = !this.config.config("validateLines");
        this.config.config("validateLines", value);
        if (value) {
            const errMsg = flatMap(this.status.validate().map((v) => v.errMsg));
            if (errMsg.length) {
                this.message.alert(errMsg.join("<br />"));
            }
        }
    }

    toggleShowLineLength() {
        this.config.config("hideLineLength", !this.config.config("hideLineLength"));
    }

    toggleShowLineGongshi() {
        this.config.config("hideLineGongshi", !this.config.config("hideLineGongshi"));
    }

    async setShowGongshi() {
        const num = Number(
            await this.message.prompt({
                type: "number",
                hint: "若小于等于0则不显示",
                value: this.config.config("lineGongshi").toString(),
                placeholder: "公式字体大小"
            })
        );
        this.config.config("lineGongshi", num);
    }

    async resetLineLength() {
        const cad = this.status.cad;
        if (cad.config("hideLineLength")) {
            return;
        }
        cad.traverse((e) => {
            if (e instanceof CadMtext && e.info.isLengthText) {
                (e.parent as CadLineLike).lengthTextSize = DEFAULT_LENGTH_TEXT_SIZE;
                e.remove();
            }
        }, true);
        this.status.generateLineTexts();
        cad.render().render();
    }

    printCad() {
        this.console.execute("print");
    }

    fillet(radius?: number) {
        this.console.execute("fillet", {radius: radius ? radius.toString() : "0"});
    }

    backToNormal() {
        this.status.cadStatus("name", "normal");
    }

    newCad() {
        this.console.execute("new-cad");
    }

    setKailiaofangshi() {
        this.status.getFlatSelectedCads().forEach((cad) => {
            sortLines(cad).forEach((group) => {
                const start = group[0];
                const end = group[group.length - 1];
                if (start) {
                    start.kailiaofangshi = "使用线长";
                }
                if (end) {
                    end.kailiaofangshi = "使用线长";
                }
            });
        });
    }
}
