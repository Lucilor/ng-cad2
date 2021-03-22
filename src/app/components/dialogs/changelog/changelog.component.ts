import {ChangeDetectorRef, Component, Input} from "@angular/core";
import {MatDialogRef} from "@angular/material/dialog";
import {routesInfo} from "@src/app/app.common";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {Changelog, changelogTypes} from "@src/app/views/changelog-admin/changelog-admin.component";
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
    routesInfo = routesInfo;
    get isAdmin() {
        return this.status.isAdmin;
    }

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
        if (this.currentPage > maxPage) {
            return;
        }
        const page = this.currentPage + 1;
        this.loading = true;
        const response = await this.dataService.get<Changelog>("ngcad/getChangelog", {page, pageSize}, false);
        this.loading = false;
        if (response?.data) {
            this.changelog = this.changelog.concat(response.data);
            this.maxPage = Math.ceil((response.count || 0) / pageSize);
            this.currentPage++;
        }
    }

    getTitle(timeStamp: number) {
        return new Date(timeStamp).toLocaleDateString();
    }

    getType(key: string) {
        return changelogTypes[key];
    }

    onYReachEnd() {
        this.nextPage();
        this.cd.detectChanges();
    }

    close() {
        this.dialogRef.close();
    }
}

export const openChangelogDialog = getOpenDialogFunc<ChangelogComponent, void, void>(ChangelogComponent);
