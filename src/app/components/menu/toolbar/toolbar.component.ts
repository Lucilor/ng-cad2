import {Component, OnInit, OnDestroy} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {Router} from "@angular/router";
import {local} from "@app/app.common";
import {CadMtext, CadLineLike, DEFAULT_LENGTH_TEXT_SIZE, sortLines, CadLine} from "@cad-viewer";
import {openBbzhmkgzDialog} from "@components/dialogs/bbzhmkgz/bbzhmkgz.component";
import {openCadLineTiaojianquzhiDialog} from "@components/dialogs/cad-line-tjqz/cad-line-tjqz.component";
import {editCadZhankai} from "@components/dialogs/cad-zhankai/cad-zhankai.component";
import {openChangelogDialog} from "@components/dialogs/changelog/changelog.component";
import {Subscribed} from "@mixins/subscribed.mixin";
import {CadConsoleService} from "@modules/cad-console/services/cad-console.service";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
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
    get data() {
        return this.status.cad.data;
    }

    onKeyDown = ((event: KeyboardEvent) => {
        const {ctrlKey} = event;
        if (!event.key) {
            // ? key有可能是undefined
            return;
        }
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
        private dataService: CadDataService,
        private spinner: SpinnerService,
        private router: Router
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
        const numStr = await this.message.prompt({
            promptData: {
                type: "number",
                hint: "请输入大于0的数字",
                value: this.config.getConfig("lineGongshi").toString(),
                placeholder: "公式字体大小",
                validators: [(control) => (control.value > 0 ? null : {公式字体大小必须大于0: true})]
            }
        });
        if (numStr !== null) {
            this.config.setConfig("lineGongshi", Number(numStr));
            await this.status.cad.render();
        }
    }

    async setPointSize() {
        const pointSize = this.config.getConfig("pointSize").toString();
        const result = await this.message.prompt({promptData: {value: pointSize, type: "number", placeholder: "选取点大小"}});
        const n = Number(result);
        if (!isNaN(n)) {
            this.config.setConfig("pointSize", n);
        }
    }

    async resetLineLength() {
        const cad = this.status.cad;
        if (cad.getConfig("hideLineLength")) {
            return;
        }
        cad.traverse((e) => {
            if (e instanceof CadMtext && e.info.isLengthText) {
                (e.parent as CadLineLike).lengthTextSize = DEFAULT_LENGTH_TEXT_SIZE;
                e.remove();
            }
        }, true);
        this.status.generateLineTexts();
        await cad.render();
        cad.render();
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
        sortLines(this.status.cad.data).forEach((group) => {
            const start = group[0];
            const end = group[group.length - 1];
            if (start) {
                start.zhankaifangshi = "使用线长";
            }
            if (end) {
                end.zhankaifangshi = "使用线长";
            }
        });
    }

    highlightTjqz() {
        this.status.cad.data.getAllEntities().line.forEach((e) => {
            if (e.tiaojianquzhi.length > 0) {
                e.selected = true;
            } else {
                e.selected = false;
            }
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
        const data = this.status.cad.data;
        for (const component of data.components.data) {
            const rect = component.getBoundingRect();
            component.transform({scale: [factorNum, factorNum], origin: [rect.x, rect.y]}, true);
        }
        data.updateComponents();
        this.status.cad.render();
    }

    private async _checkSelectedOnlyOne() {
        const selected = this.status.cad.selected();
        const lines = selected.toArray().filter((v) => v instanceof CadLine) as CadLine[];
        if (lines.length !== 1) {
            this.message.alert("请先选中且只选中一根线");
            return null;
        }
        return lines[0];
    }

    async editZhankai() {
        await editCadZhankai(this.dialog, this.status.cad.data);
    }

    async editTiaojianquzhi() {
        const line = await this._checkSelectedOnlyOne();
        if (line) {
            openCadLineTiaojianquzhiDialog(this.dialog, {data: line});
        }
    }

    async editGongshi() {
        const line = await this._checkSelectedOnlyOne();
        if (line) {
            const gongshi = await this.message.prompt({title: "编辑公式", promptData: {value: line.gongshi, placeholder: "公式"}});
            if (gongshi !== null) {
                line.gongshi = gongshi;
                this.status.cad.render(line);
            }
        }
    }

    async editBbzhmkgz() {
        const data = this.status.cad.data;
        const result = await openBbzhmkgzDialog(this.dialog, {
            width: "80%",
            height: "75%",
            data: {value: data.info.修改包边正面宽规则 || "", vars: data.info.vars}
        });
        if (result) {
            data.info.修改包边正面宽规则 = result.value;
        }
    }

    async resetIds() {
        const data = this.status.cad.data;
        const yes = await this.message.confirm({
            title: "重设ID",
            content: `重新生成<span style="color:red">${data.name}</span>的所有实体ID，是否确定？`
        });
        if (!yes) {
            return;
        }
        data.resetIds(true);
        await timeout(0);
        this.message.snack("重设ID完成");
    }

    async copyCad() {
        const collection = this.status.collection$.getValue();
        const loaderId = this.spinner.defaultLoaderId;
        this.spinner.show(loaderId);
        const response = await this.dataService.post<string[]>("ngcad/copyCads", {collection, vids: [this.status.cad.data.id]});
        this.spinner.hide(loaderId);
        if (response?.code === 0) {
            const yes = await this.message.confirm({title: response.msg, content: "是否跳转至新的CAD？"});
            if (yes) {
                this.spinner.show(loaderId);
                const cads2 = await this.dataService.getCad({ids: response.data, collection});
                await this.status.openCad(cads2.cads[0]);
                this.spinner.hide(loaderId);
            }
        }
    }

    async removeCad() {
        const data = this.status.cad.data;
        if (await this.message.confirm(`确定要删除吗？`)) {
            const collection = this.status.collection$.getValue();
            const ids = [data.id];
            const deletedIds = await this.dataService.removeCads(collection, ids);
            if (deletedIds) {
                document.body.innerHTML = "<h1>已删除</h1>";
            }
        }
    }

    goToBackup() {
        const url = this.router.createUrlTree(["/backup"], {queryParamsHandling: "merge"});
        window.open(url.toString());
    }
}
