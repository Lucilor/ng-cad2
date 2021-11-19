import {Component, AfterViewInit, ViewChild, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog} from "@angular/material/dialog";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {MatSlideToggleChange} from "@angular/material/slide-toggle";
import {MatTooltipDefaultOptions, MAT_TOOLTIP_DEFAULT_OPTIONS} from "@angular/material/tooltip";
import {DomSanitizer} from "@angular/platform-browser";
import {CadCollection, imgLoading, timer} from "@app/app.common";
import {getCadPreview} from "@app/cad.utils";
import {CadData} from "@cad-viewer";
import {Utils} from "@mixins/utils.mixin";
import {CadDataService, GetCadParams} from "@modules/http/services/cad-data.service";
import {AppStatusService} from "@services/app-status.service";
import {ObjectOf} from "@utils";
import {difference} from "lodash";
import {BehaviorSubject, lastValueFrom} from "rxjs";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";
import {getOpenDialogFunc} from "../dialog.common";

export interface CadListData {
    selectMode: "single" | "multiple" | "table";
    checkedItems?: string[];
    options?: CadData["options"];
    collection: CadCollection;
    qiliao?: boolean;
    search?: ObjectOf<any>;
    fixedSearch?: ObjectOf<any>;
}

export const customTooltipOptions: MatTooltipDefaultOptions = {
    showDelay: 500,
    hideDelay: 0,
    touchendHideDelay: 0,
    position: "above"
};

@Component({
    selector: "app-cad-list",
    templateUrl: "./cad-list.component.html",
    styleUrls: ["./cad-list.component.scss"],
    providers: [{provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: customTooltipOptions}]
})
export class CadListComponent extends Utils() implements AfterViewInit {
    length = 0;
    pageSizeOptions = [1, 10, 20, 50, 100];
    pageSize = 20;
    pageData: {data: CadData; img: string; checked: boolean}[] = [];
    tableData: any = [];
    displayedColumns = ["select", "mingzi", "wenjian", "create_time", "modify_time"];
    width = 300;
    height = 150;
    searchField = "选项";
    searchNameInput = "";
    checkedIndex = new BehaviorSubject<number>(-1);
    checkedItems: string[] = [];
    checkedColumns: any[] = [];
    checkedInOtherPages = false;
    showCheckedOnly = false;
    @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;

    constructor(
        public dialogRef: MatDialogRef<CadListComponent, CadData[]>,
        @Inject(MAT_DIALOG_DATA) public data: CadListData,
        private sanitizer: DomSanitizer,
        private status: AppStatusService,
        private dataService: CadDataService,
        private dialog: MatDialog
    ) {
        super();
    }

    async ngAfterViewInit() {
        if (!this.paginator) {
            return;
        }
        await lastValueFrom(this.paginator.initialized);
        if (Array.isArray(this.data.checkedItems)) {
            this.checkedItems = this.data.checkedItems.slice();
        }
        this.data.qiliao = this.data.qiliao === true;
        this.getData(1);
        this.checkedIndex.subscribe((i) => {
            if (this.data.selectMode === "single") {
                if (this.pageData[i]) {
                    this.checkedItems = [this.pageData[i].data.id];
                } else {
                    // this.checkedItems = [];
                }
            }
        });
    }

    changePage(event: PageEvent) {
        this.syncCheckedItems();
        this.getData(event.pageIndex + 1);
    }

    syncCheckedItems() {
        if (this.data.selectMode === "multiple") {
            const toRemove: string[] = [];
            let checkedNum = 0;
            this.pageData.forEach((v) => {
                const index = this.checkedItems.indexOf(v.data.id);
                if (v.checked) {
                    if (index === -1) {
                        this.checkedItems.push(v.data.id);
                    } else {
                        this.checkedItems[index] = v.data.id;
                    }
                    checkedNum++;
                } else if (index > -1) {
                    toRemove.push(v.data.id);
                }
            });
            this.checkedItems = difference(this.checkedItems, toRemove);
            this.checkedInOtherPages = checkedNum < this.checkedItems.length;
        } else if (this.data.selectMode === "single") {
            const id = this.checkedItems[0];
            if (id) {
                const index = this.pageData.findIndex((v) => v.data.id === id);
                this.checkedIndex.next(index);
            }
        }
    }

    async getData(page: number, options: CadData["options"] = {}, matchType: "and" | "or" = "and") {
        if (!this.paginator) {
            return null;
        }
        const limit = this.paginator.pageSize;
        const collection = this.data.collection;
        const search = {...this.data.search, ...this.data.fixedSearch};
        const params: GetCadParams = {collection, page, limit, search};
        if (this.data.selectMode === "table") {
            this.status.startLoader({id: "cadList"});
            const result = await this.dataService.getYuanshicadwenjian(params);
            this.status.stopLoader();
            this.length = result.total;
            this.pageData.length = 0;
            this.tableData = result.cads;
            return result;
        } else {
            params.qiliao = this.data.qiliao;
            params.options = options;
            params.optionsMatchType = matchType;
            if (this.showCheckedOnly) {
                params.ids = this.checkedItems.slice();
            }
            this.status.startLoader({id: "cadList"});
            const result = await this.dataService.getCad(params);
            this.status.stopLoader();
            this.length = result.total;
            this.pageData.length = 0;
            result.cads.forEach(async (d, i) => {
                const checked = this.checkedItems.find((v) => v === d.id) ? true : false;
                if (checked && this.data.selectMode === "single") {
                    this.checkedIndex.next(i);
                }
                const pageData = {data: d, img: imgLoading, checked};
                this.pageData.push(pageData);
            });
            this.checkedIndex.next(-1);
            this.syncCheckedItems();
            const timerName = "cad-list-getData";
            timer.start(timerName);
            for (const data of this.pageData) {
                const url = await getCadPreview(data.data);
                data.img = this.sanitizer.bypassSecurityTrustUrl(url) as string;
            }
            timer.end(timerName, "渲染CAD列表");
            return result;
        }
    }

    search(withOption = false, matchType: "and" | "or" = "and") {
        if (!this.paginator) {
            return;
        }
        this.data.search = {};
        this.data.search[this.searchField] = this.searchNameInput;
        this.paginator.pageIndex = 0;
        const options = withOption ? this.data.options : {};
        this.getData(this.paginator.pageIndex + 1, options, matchType);
    }

    async advancedSearch() {
        if (!this.paginator) {
            return;
        }
        const result = await openCadSearchFormDialog(this.dialog, {});
        if (result) {
            this.paginator.pageIndex = 0;
            this.getData(this.paginator.pageIndex + 1, result);
        }
    }

    searchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            this.search();
        }
    }

    toggleSelectAll() {
        if (this.allChecked()) {
            this.pageData.forEach((v) => (v.checked = false));
            this.checkedItems.length = 0;
        } else {
            this.pageData.forEach((v) => (v.checked = true));
            this.syncCheckedItems();
        }
    }

    allChecked() {
        return !this.pageData.every((v) => !v.checked);
    }

    partiallyChecked() {
        if (this.checkedInOtherPages) {
            return true;
        }
        const ckeckedNum = this.pageData.filter((v) => v.checked).length;
        return ckeckedNum > 0 && ckeckedNum < this.pageData.length;
    }

    async submit() {
        if (this.data.selectMode === "table") {
            this.status.startLoader({id: "submitLoader"});
            const result = await this.dataService.getCad({id: this.checkedColumns[0].vid, collection: "p_yuanshicadwenjian"});
            this.status.stopLoader();
            this.dialogRef.close(result.cads);
        } else {
            this.syncCheckedItems();
            this.status.startLoader({id: "submitLoader"});
            const result = await this.dataService.getCad({ids: this.checkedItems.slice(), collection: this.data.collection});
            this.status.stopLoader();
            this.dialogRef.close(result.cads);
        }
    }

    close() {
        this.dialogRef.close();
    }

    toggleShowCheckedOnly(evnet: MatSlideToggleChange) {
        this.showCheckedOnly = evnet.checked;
        this.search();
    }

    asCadDataArray(value: CadData[]) {
        return value;
    }
}

export const openCadListDialog = getOpenDialogFunc<CadListComponent, CadListData, CadData[]>(CadListComponent, {
    width: "85%",
    height: "85%"
});
