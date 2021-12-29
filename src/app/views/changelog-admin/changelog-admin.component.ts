import {MatDatetimePickerInputEvent} from "@angular-material-components/datetime-picker";
import {CdkDragDrop, moveItemInArray} from "@angular/cdk/drag-drop";
import {AfterViewInit, Component, ViewChild} from "@angular/core";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {routesInfo} from "@app/app.common";
import {Utils} from "@mixins/utils.mixin";
import {Changelog, CadDataService} from "@modules/http/services/cad-data.service";
import {MessageService} from "@modules/message/services/message.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {downloadByString, downloadByUrl, ObjectOf} from "@utils";
import {cloneDeep} from "lodash";
import {lastValueFrom} from "rxjs";

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
    changelogRaw: Changelog | null = null;
    length = 0;
    pageSizeOptions = [5, 10, 20, 50, 100];
    routesInfo = routesInfo;
    focusedContentText: number[] | null = null;
    loaderId = "changelogAdmin";
    @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;
    get page() {
        return (this.paginator?.pageIndex || 0) + 1;
    }
    get pageSize() {
        return this.paginator?.pageSize || 5;
    }

    constructor(private dataService: CadDataService, private message: MessageService, private spinner: SpinnerService) {
        super();
    }

    async ngAfterViewInit() {
        if (!this.paginator) {
            return;
        }
        await lastValueFrom(this.paginator.initialized);
        this.getChangelog(1);
    }

    async getChangelog(page = this.page) {
        if (this.changelogRaw) {
            const offset = (page - 1) * this.pageSize;
            this.changelog = cloneDeep(this.changelogRaw.slice(offset, offset + this.pageSize));
            this.length = this.changelogRaw.length;
        } else {
            this.spinner.show(this.loaderId);
            const {changelog, count} = await this.dataService.getChangelog(page, this.pageSize);
            this.spinner.hide(this.loaderId);
            this.changelog = changelog.filter((v) => v && typeof v === "object");
            this.length = count;
        }
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
        const index = (this.page - 1) * this.pageSize + i;
        if (this.changelogRaw) {
            this.changelogRaw[index] = this.changelog[i];
        } else {
            const loaderId = `${this.loaderId}Set${i}`;
            this.spinner.show(loaderId);
            await this.dataService.setChangelogItem(this.changelog[i], index);
            this.spinner.hide(loaderId);
        }
    }

    async addChangelogItem(i: number) {
        const newChangelog: Changelog[0] = {timeStamp: new Date().getTime(), content: []};
        if (this.changelogRaw) {
            this.changelogRaw.splice(i, 0, newChangelog);
            await this.getChangelog();
        } else {
            const loaderId = `${this.loaderId}Add${i}`;
            this.spinner.show(loaderId);
            await this.dataService.addChangelogItem(newChangelog, i);
            await this.getChangelog();
            this.spinner.hide(loaderId);
        }
    }

    async removeChangelogItem(i: number) {
        const index = (this.page - 1) * this.pageSize + i;
        if (this.changelogRaw) {
            this.changelogRaw.splice(index, 1);
            await this.getChangelog();
        } else {
            const loaderId = `${this.loaderId}Remove${i}`;
            this.spinner.show(loaderId);
            await this.dataService.removeChangelogItem(index);
            this.spinner.hide(loaderId);
            await this.getChangelog();
        }
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

    setSourceData(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        this.spinner.show(this.loaderId);
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => {
            let data: Changelog | undefined;
            try {
                data = JSON.parse(reader.result as string);
            } catch (e) {
                console.error(e);
            }
            this.spinner.hide(this.loaderId);
            if (data) {
                this.changelogRaw = data;
                this.getChangelog(1);
            }
        };
        reader.onerror = (ev) => {
            console.error(ev);
            this.spinner.hide(this.loaderId);
        };
        input.value = "";
    }

    fetchChangelog() {
        downloadByUrl("https://www.let888.cn/n/static/ngcad2_changelog.json");
    }

    downloadChangelog() {
        if (this.changelogRaw) {
            for (let i = 0; i < this.changelog.length; i++) {
                const index = (this.page - 1) * this.pageSize + i;
                this.changelogRaw[index] = this.changelog[i];
            }
            downloadByString(JSON.stringify(this.changelogRaw), {filename: "ngcad2_changelog.json"});
        }
    }
}
