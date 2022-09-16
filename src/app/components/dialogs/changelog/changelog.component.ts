import {ChangeDetectorRef, Component, Input} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";
import {CadDataService} from "@modules/http/services/cad-data.service";
import {Changelog} from "@modules/http/services/cad-data.service.types";
import {AppStatusService} from "@services/app-status.service";
import {changelogTypes} from "@views/changelog-admin/changelog-admin.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-changelog",
    templateUrl: "./changelog.component.html",
    styleUrls: ["./changelog.component.scss"]
})
export class ChangelogComponent {
    @Input() pageSize = 10;
    changelog: Changelog = [];
    currentPage = 0;
    maxPage = 1;
    loading = false;
    get isAdmin$() {
        return this.status.isAdmin$;
    }
    private _nextPageLock = false;

    constructor(
        private cd: ChangeDetectorRef,
        public dialogRef: MatDialogRef<ChangelogComponent, void>,
        private dataService: CadDataService,
        private status: AppStatusService
    ) {
        this.nextPage();
    }

    private async nextPage() {
        const {pageSize, maxPage} = this;
        if (this.currentPage >= maxPage || this._nextPageLock) {
            return;
        }
        this._nextPageLock = true;
        const page = this.currentPage + 1;
        this.loading = true;
        const {changelog, count} = await this.dataService.getChangelog(page, pageSize);
        this.loading = false;
        this.changelog = this.changelog.concat(changelog);
        this.maxPage = Math.ceil((count || 0) / pageSize);
        this.currentPage++;
        this.cd.detectChanges();
        this._nextPageLock = false;
    }

    getTitle(timeStamp: number) {
        return new Date(timeStamp).toLocaleDateString();
    }

    getType(key: string) {
        return changelogTypes[key];
    }

    onYReachEnd() {
        this.nextPage();
    }

    close() {
        this.dialogRef.close();
    }
}

export const openChangelogDialog = getOpenDialogFunc<ChangelogComponent, void, void>(ChangelogComponent);
