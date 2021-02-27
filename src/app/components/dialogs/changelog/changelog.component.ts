import {Component} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";
import changelog from "@src/app/changelog.json";
import {ObjectOf} from "@src/app/utils";
import {getOpenDialogFunc} from "../dialog.common";

const typeMap: ObjectOf<string> = {
    feat: "✨新特性",
    fix: "🐞bug修复",
    refactor: "🦄代码重构",
    perf: "🎈体验优化"
};

@Component({
    selector: "app-changelog",
    templateUrl: "./changelog.component.html",
    styleUrls: ["./changelog.component.scss"]
})
export class ChangelogComponent {
    changelog: {
        title: string;
        content: {type: string; items: string[]}[];
    }[] = changelog.map((v) => ({
        title: new Date(v.timestamp).toLocaleDateString(),
        content: v.content.map((vv) => ({type: typeMap[vv.type], items: vv.items}))
    }));

    constructor(public dialogRef: MatDialogRef<ChangelogComponent, void>) {}
}

export const openChangelogDialog = getOpenDialogFunc<ChangelogComponent, void, void>(ChangelogComponent);
