import {MatDatetimePickerInputEvent} from "@angular-material-components/datetime-picker";
import {Component, OnInit} from "@angular/core";
import {routesInfo} from "@src/app/app.common";
import {CadDataService, Changelog} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {ObjectOf} from "@src/app/utils";

export const changelogTypes: ObjectOf<string> = {
    feat: "✨新特性",
    fix: "🐞bug修复",
    refactor: "🦄代码重构",
    perf: "🎈体验优化"
};

@Component({
    selector: "app-changelog-admin",
    templateUrl: "./changelog-admin.component.html",
    styleUrls: ["./changelog-admin.component.scss"]
})
export class ChangelogAdminComponent implements OnInit {
    changelogTypeKeys = Object.keys(changelogTypes);
    changelog: Changelog = [];
    pageSize = 10;
    currentPage = 0;
    get changelogPaged() {
        return this.changelog.slice(0, this.currentPage * this.pageSize);
    }
    routesInfo = routesInfo;

    constructor(private dataService: CadDataService, private message: MessageService, private status: AppStatusService) {}

    ngOnInit() {
        (async () => {
            const {changelog} = await this.dataService.getChangelog();
            this.changelog = changelog;
        })();
    }

    getDate(timeStamp: number) {
        return new Date(timeStamp);
    }

    onDateChange(event: MatDatetimePickerInputEvent<Date>, i: number) {
        if (event.value) {
            this.changelog[i].timeStamp = event.value.getTime();
        }
    }

    async editItem(i: number, j: number, k: number) {
        const result = await this.message.editor(this.changelog[i].content[j].items[k]);
        if (result) {
            this.changelog[i].content[j].items[k] = result as string;
        }
    }

    trackByIdx(index: number, _obj: any): any {
        return index;
    }

    add<T>(arr: T[], i: number, v: T) {
        arr.splice(i + 1, 0, v);
    }

    remove<T>(arr: T[], i: number) {
        arr.splice(i, 1);
    }

    addChangelog(i: number) {
        this.add(this.changelog, i - 1, {timeStamp: new Date().getTime(), content: [{type: "", items: [""]}]});
    }

    removeChangelog(i: number) {
        this.remove(this.changelog, i);
    }

    addContent(i: number, j: number) {
        this.add(this.changelog[i].content, j, {type: "", items: [""]});
    }

    removeContent(i: number, j: number) {
        this.remove(this.changelog[i].content, j);
    }

    addItem(i: number, j: number, k: number) {
        this.add(this.changelog[i].content[j].items, k, "");
    }

    removeItem(i: number, j: number, k: number) {
        this.remove(this.changelog[i].content[j].items, k);
    }

    async submit() {
        this.status.startLoader();
        await this.dataService.setChangelog(this.changelog);
        this.status.stopLoader();
    }

    onYReachEnd() {
        this.currentPage++;
    }

    setTime(i: number) {
        this.changelog[i].timeStamp = new Date().getTime();
    }
}
