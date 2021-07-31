import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {routesInfo, local} from "@app/app.common";
import {CadMtext, CadLineLike, DEFAULT_LENGTH_TEXT_SIZE, sortLines, CadLine} from "@cad-viewer";
import {openCadLineTiaojianquzhiDialog} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {editCadZhankai} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {openChangelogDialog} from "@components/dialogs/changelog/changelog.component";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppConfigService, AppConfig} from "@services/app-config.service";
import {AppStatusService} from "@services/app-status.service";
import {CadStatusNormal} from "@services/cad-status";
import {ObjectOf, timeout} from "@utils";
import {flatMap} from "lodash";

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
        private dialog: MatDialog
    ) {
        super();
        this.subscribe(this.status.changelogTimeStamp$, (changelogTimeStamp) => {
            this.showNew = changelogTimeStamp > Number(local.load("changelogTimeStamp") || 0);
        });
    }

    ngOnInit() {
        window.addEventListener("keydown", this.onKeyDown);
    }

    ngOnDestroy() {
        window.removeEventListener("keydown", this.onKeyDown);
    }

    getConfig(key: keyof AppConfig) {
        return this.config.getConfig(key);
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
            const input = await this.message.prompt({promptData: {type: "number", placeholder: "输入角度"}});
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
        this.config.setConfig("hideDimensions", !this.config.getConfig("hideDimensions"));
    }

    toggleShowCadGongshis() {
        this.config.setConfig("showCadGongshis", !this.config.getConfig("showCadGongshis"));
    }

    toggleValidateLines() {
        const value = !this.config.getConfig("validateLines");
        this.config.setConfig("validateLines", value);
        if (value) {
            const errMsg = flatMap(this.status.validate().map((v) => v.errMsg));
            if (errMsg.length) {
                this.message.alert(errMsg.join("<br />"));
            }
        }
    }

    toggleShowLineLength() {
        this.config.setConfig("hideLineLength", !this.config.getConfig("hideLineLength"));
    }

    toggleShowLineGongshi() {
        this.config.setConfig("hideLineGongshi", !this.config.getConfig("hideLineGongshi"));
    }

    async setShowGongshi() {
        const num = Number(
            await this.message.prompt({
                promptData: {
                    type: "number",
                    hint: "若小于等于0则不显示",
                    value: this.config.getConfig("lineGongshi").toString(),
                    placeholder: "公式字体大小"
                }
            })
        );
        this.config.setConfig("lineGongshi", num);
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

    async scaleComponents(factorNum?: number) {
        if (factorNum === undefined) {
            const factorStr = await this.message.prompt({
                title: "放大装配CAD",
                promptData: {type: "number", placeholder: "请输入放大倍数"}
            });
            if (typeof factorStr !== "string") {
                return;
            }
            factorNum = Number(factorStr);
            if (isNaN(factorNum)) {
                this.message.alert("请输入有效数字");
                return;
            }
        }
        const cads = this.status.getFlatSelectedCads();
        for (const cad of cads) {
            for (const component of cad.components.data) {
                const rect = component.getBoundingRect();
                component.transform({scale: [factorNum, factorNum], origin: [rect.x, rect.y]}, true);
            }
            cad.updateComponents();
        }
        this.status.cad.render();
    }

    async editZhankai() {
        const data = this.status.getFlatSelectedCads()[0];
        if (data) {
            await editCadZhankai(this.dialog, data);
        }
    }

    async editTiaojianquzhi() {
        const selected = this.status.cad.selected();
        const lines = selected.toArray().filter((v) => v instanceof CadLine) as CadLine[];
        if (lines.length < 1) {
            this.message.alert("请先选中一条直线");
        } else if (lines.length > 1) {
            this.message.alert("无法同时编辑多根线的条件取值");
        } else {
            openCadLineTiaojianquzhiDialog(this.dialog, {data: lines[0]});
        }
    }

    async resetIds() {
        const cads = this.status.getFlatSelectedCads();
        const names = cads.map((v) => v.name);
        const yes = await this.message.confirm({
            title: "重设ID",
            content: `重新生成<span style="color:red">${names.join("，")}</span>的实体ID，是否确定？`
        });
        if (!yes) {
            return;
        }
        cads.forEach((cad) => cad.resetIds(true));
        await timeout(0);
        this.message.snack("重设ID完成");
    }
}
