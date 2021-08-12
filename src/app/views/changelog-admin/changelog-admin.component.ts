import {MatDatetimePickerInputEvent} from "@angular-material-components/datetime-picker";
import {CdkDragDrop, moveItemInArray} from "@angular/cdk/drag-drop";
import {AfterViewInit, Component, ViewChild} from "@angular/core";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {routesInfo} from "@app/app.common";
import {Utils} from "@mixins/utils.mixin";
import {Changelog, CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService} from "@services/app-status.service";
import {ObjectOf} from "@utils";

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
export class ChangelogAdminComponent extends Utils() implements AfterViewInit {
    changelogTypeKeys = Object.keys(changelogTypes);
    changelog: Changelog = [];
    length = 0;
    pageSizeOptions = [5, 10, 20, 50, 100];
    routesInfo = routesInfo;
    focusedContentText: number[] | null = null;
    @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;
    get page() {
        return (this.paginator?.pageIndex || 0) + 1;
    }
    get pageSize() {
        return this.paginator?.pageSize || 5;
    }

    constructor(private dataService: CadDataService, private message: MessageService, private status: AppStatusService) {
        super();
    }

    async ngAfterViewInit() {
        if (!this.paginator) {
            return;
        }
        await this.paginator.initialized.toPromise();
        this.getChangelog(1);
    }

    async getChangelog(page = this.page) {
        this.status.startLoader({id: "changelog"});
        const {changelog, count} = await this.dataService.getChangelog(page, this.pageSize);
        this.status.stopLoader();
        this.changelog = changelog;
        this.length = count;
    }

    changePage(event: PageEvent) {
        this.getChangelog(event.pageIndex + 1);
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
            this.changelog[i].content[j].items[k] = result;
        }
    }

    trackByIdx(index: number, _obj: any): any {
        return index;
    }

    addChangelog(i: number) {
        this.arrayAdd(this.changelog, {timeStamp: new Date().getTime(), content: [{type: "", items: [""]}]}, i);
    }

    removeChangelog(i: number) {
        this.arrayRemove(this.changelog, i);
    }

    addContent(i: number, j: number) {
        this.arrayAdd(this.changelog[i].content, {type: "", items: [""]}, j + 1);
    }

    removeContent(i: number, j: number) {
        this.arrayRemove(this.changelog[i].content, j);
    }

    addItem(i: number, j: number, k: number) {
        this.arrayAdd(this.changelog[i].content[j].items, "", k + 1);
    }

    removeItem(i: number, j: number, k: number) {
        this.arrayRemove(this.changelog[i].content[j].items, k);
    }

    setTime(i: number) {
        this.changelog[i].timeStamp = new Date().getTime();
    }

    dropContent(event: CdkDragDrop<Changelog[0]["content"]>, i: number) {
        moveItemInArray(this.changelog[i].content, event.previousIndex, event.currentIndex);
    }

    dropContentText(event: CdkDragDrop<Changelog[0]["content"][0]["items"]>, i: number, j: number) {
        moveItemInArray(this.changelog[i].content[j].items, event.previousIndex, event.currentIndex);
    }

    async setChangelogItem(i: number) {
        this.status.startLoader({id: "set" + i});
        await this.dataService.setChangelogItem(this.changelog[i], (this.page - 1) * this.pageSize + i);
        this.status.stopLoader();
    }

    async addChangelogItem(i: number) {
        this.status.startLoader({id: "add" + i});
        await this.dataService.addChangelogItem({timeStamp: new Date().getTime(), content: []}, i);
        this.status.stopLoader();
        await this.getChangelog();
    }

    async removeChangelogItem(i: number) {
        this.status.startLoader({id: "remove" + i});
        await this.dataService.removeChangelogItem(i);
        this.status.stopLoader();
        await this.getChangelog();
    }

    isDropListDisabled(i: number, j?: number) {
        if (this.focusedContentText) {
            const [i2, j2] = this.focusedContentText;
            if (typeof j === "number") {
                return i === i2 && j === j2;
            }
            return i === i2;
        }
        return false;
    }
}
