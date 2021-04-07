import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {local, routesInfo} from "@src/app/app.common";
import {CadMtext, CadLineLike, DEFAULT_LENGTH_TEXT_SIZE, sortLines} from "@src/app/cad-viewer";
import {CadConsoleService} from "@src/app/modules/cad-console/services/cad-console.service";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppConfigService, AppConfig} from "@src/app/services/app-config.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {CadStatusNormal} from "@src/app/services/cad-status";
import {ObjectOf} from "@src/app/utils";
import {flatMap} from "lodash";
import {openChangelogDialog} from "../../dialogs/changelog/changelog.component";

@Component({
    selector: "app-toolbar",
    templateUrl: "./toolbar.component.html",
    styleUrls: ["./toolbar.component.scss"]
})
export class ToolbarComponent implements OnInit, OnDestroy {
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
    showNew = false;
    routesInfo = routesInfo;

    get isStatusNormal() {
        return this.status.cadStatus instanceof CadStatusNormal;
    }
    get statusName() {
        return this.status.cadStatus.name;
    }
    get canExit() {
        return !!this.status.cadStatus.canExit;
    }
    get exitWithEsc() {
        const {canExit, exitWithEsc} = this.status.cadStatus;
        return canExit && exitWithEsc;
    }
    get canConfirm() {
        return !!this.status.cadStatus.canConfirm;
    }
    get confirmWithEnter() {
        const {canConfirm, confirmWithEnter} = this.status.cadStatus;
        return canConfirm && confirmWithEnter;
    }

    onKeyDown = ((event: KeyboardEvent) => {
        const {ctrlKey} = event;
        const key = event.key.toLowerCase();
        if (ctrlKey && this.keyMap[key]) {
            event.preventDefault();
            this.clickBtn(key);
        } else if (key === "escape") {
            if (this.exitWithEsc) {
                event.preventDefault();
                this.backToNormal();
            }
        } else if (key === "enter") {
            if (this.confirmWithEnter) {
                event.preventDefault();
                this.backToNormal(true);
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
        (async () => {
            const timeStamp = Number(local.load("changelogTimeStamp"));
            const {changelog} = await this.dataService.getChangelog(1, 1);
            if (changelog.length) {
                this.showNew = timeStamp < changelog[0].timeStamp;
            }
        })();
    }

    ngOnInit() {
        window.addEventListener("keydown", this.onKeyDown);
    }

    ngOnDestroy() {
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
        local.save("changelogTimeStamp", new Date().getTime());
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

    backToNormal(confirmed?: boolean) {
        this.status.setCadStatus(new CadStatusNormal(), confirmed);
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
                    start.zhankaifangshi = "使用线长";
                }
                if (end) {
                    end.zhankaifangshi = "使用线长";
                }
            });
        });
    }
}
