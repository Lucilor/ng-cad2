import {ChangeDetectorRef, Component, Input} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";
import changelog from "@src/app/changelog.json";
import {ObjectOf} from "@src/app/utils";
import {PerfectScrollbarEvent} from "ngx-perfect-scrollbar/lib/perfect-scrollbar.interfaces";
import {getOpenDialogFunc} from "../dialog.common";

const typeMap: ObjectOf<string> = {
    feat: "✨新特性",
    fix: "🐞bug修复",
    refactor: "🦄代码重构",
    perf: "🎈体验优化"
};

type Changelog = {
    title: string;
    content: {type: string; items: string[]}[];
}[];
@Component({
    selector: "app-changelog",
    templateUrl: "./changelog.component.html",
    styleUrls: ["./changelog.component.scss"]
})
export class ChangelogComponent {
    // * fake infinite scroll
    @Input() logsPerPage = 10;
    changelogAll: Changelog = changelog.map((v) => ({
        title: new Date(v.timestamp).toLocaleDateString(),
        content: v.content.map((vv) => ({type: typeMap[vv.type], items: vv.items}))
    }));
    changelog: Changelog = [];
    currentPage = 0;

    constructor(private cd: ChangeDetectorRef, public dialogRef: MatDialogRef<ChangelogComponent, void>) {
        this.setPage(0);
    }

    private setPage(page: number) {
        this.changelog = this.changelogAll.slice(0, (page + 1) * this.logsPerPage);
    }

    onYReachEnd(event: PerfectScrollbarEvent) {
        this.setPage(++this.currentPage);
        this.cd.detectChanges();
    }
}

export const openChangelogDialog = getOpenDialogFunc<ChangelogComponent, void, void>(ChangelogComponent);
