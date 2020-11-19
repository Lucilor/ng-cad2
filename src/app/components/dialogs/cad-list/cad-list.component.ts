import {AfterViewInit, Component, Inject, ViewChild} from "@angular/core";
import {MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {DomSanitizer} from "@angular/platform-browser";
import {imgLoading, imgEmpty, CadCollection} from "@src/app/app.common";
import {CadData, CadOption} from "@src/app/cad-viewer";
import {getCadPreview} from "@src/app/cad.utils";
import {CadDataService, GetCadParams} from "@src/app/modules/http/services/cad-data.service";
import {MessageService} from "@src/app/modules/message/services/message.service";
import {NgxUiLoaderService} from "ngx-ui-loader";
import {BehaviorSubject} from "rxjs";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";

export interface CadListData {
    selectMode: "single" | "multiple" | "table";
    checkedItems?: CadData[];
    options?: CadOption[];
    collection: CadCollection;
    qiliao?: boolean;
}

@Component({
    selector: "app-cad-list",
    templateUrl: "./cad-list.component.html",
    styleUrls: ["./cad-list.component.scss"]
})
export class CadListComponent implements AfterViewInit {
    length = 100;
    pageSizeOptions = [1, 10, 20, 50, 100];
    pageSize = 10;
    pageData: {data: CadData; img: string; checked: boolean}[] = [];
    tableData: any = [];
    displayedColumns = ["select", "mingzi", "wenjian", "create_time", "modify_time"];
    width = 300;
    height = 150;
    searchField = "选项";
    searchForm: {[key: string]: string} = {};
    searchNameInput = "";
    checkedIndex = new BehaviorSubject<number>(-1);
    checkedItems: CadData[] = [];
    checkedColumns: any[] = [];
    checkedInOtherPages = false;
    loaderId = "cadList";
    loadingText = "";
    @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;

    constructor(
        public dialogRef: MatDialogRef<CadListComponent, CadData[]>,
        @Inject(MAT_DIALOG_DATA) public data: CadListData,
        private sanitizer: DomSanitizer,
        private loader: NgxUiLoaderService,
        private dataService: CadDataService,
        private dialog: MatDialog,
        private message: MessageService
    ) {}

    async ngAfterViewInit() {
        if (!this.paginator) {
            return;
        }
        await this.paginator.initialized.toPromise();
        if (Array.isArray(this.data.checkedItems)) {
            this.checkedItems = this.data.checkedItems;
        }
        this.data.qiliao = this.data.qiliao === true;
        if (!Array.isArray(this.data.options)) {
            this.data.options = [];
        }
        this.getData(1);
        this.checkedIndex.subscribe((i) => {
            if (this.data.selectMode === "single") {
                if (this.pageData[i]) {
                    this.checkedItems = [this.pageData[i].data];
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
                const index = this.checkedItems.findIndex((vv) => vv.id === v.data.id);
                if (v.checked) {
                    if (index === -1) {
                        this.checkedItems.push(v.data);
                    } else {
                        this.checkedItems[index] = v.data;
                    }
                    checkedNum++;
                } else if (index > -1) {
                    toRemove.push(v.data.id);
                }
            });
            this.checkedItems = this.checkedItems.filter((v) => !toRemove.includes(v.id));
            this.checkedInOtherPages = checkedNum < this.checkedItems.length;
        } else if (this.data.selectMode === "single") {
            const data = this.checkedItems[0];
            if (data) {
                const index = this.pageData.findIndex((v) => v.data.id === data.id);
                this.checkedIndex.next(index);
            }
        }
    }

    async getData(page: number, options: CadOption[] = [], matchType: "and" | "or" = "and") {
        if (!this.paginator) {
            return null;
        }
        const limit = this.paginator.pageSize;
        const collection = this.data.collection;
        const params: Partial<GetCadParams> = {collection, page, limit, search: this.searchForm};
        if (this.data.selectMode === "table") {
            this.loader.startLoader(this.loaderId);
            const result = await this.dataService.getYuanshicadwenjian(params);
            this.loader.stopLoader(this.loaderId);
            this.length = result.total;
            this.pageData.length = 0;
            this.tableData = result.cads;
            return result;
        } else {
            params.qiliao = this.data.qiliao;
            params.options = options;
            params.optionsMatchType = matchType;
            this.loader.startLoader(this.loaderId);
            const result = await this.dataService.getCad(params);
            this.loader.stopLoader(this.loaderId);
            this.length = result.total;
            this.pageData.length = 0;
            result.cads.forEach(async (d, i) => {
                try {
                    const checked = this.checkedItems.find((v) => v.id === d.id) ? true : false;
                    if (checked && this.data.selectMode === "single") {
                        this.checkedIndex.next(i);
                    }
                    const pageData = {data: d, img: imgLoading, checked};
                    this.pageData.push(pageData);
                    pageData.img = this.sanitizer.bypassSecurityTrustUrl(await getCadPreview(d)) as string;
                } catch (e) {
                    console.warn(e);
                    this.pageData.push({
                        data: new CadData({id: d.id, name: d.name}),
                        img: imgEmpty,
                        checked: false
                    });
                }
            });
            this.checkedIndex.next(-1);
            this.syncCheckedItems();
            return result;
        }
    }

    search(withOption = false, matchType: "and" | "or" = "and") {
        if (!this.paginator) {
            return;
        }
        this.searchForm = {};
        this.searchForm[this.searchField] = this.searchNameInput;
        this.paginator.pageIndex = 0;
        const options = withOption ? this.data.options : [];
        this.getData(this.paginator.pageIndex + 1, options, matchType);
    }

    async advancedSearch() {
        if (!this.paginator) {
            return;
        }
        const ref = openCadSearchFormDialog(this.dialog, {});
        const result = await ref.afterClosed().toPromise();
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
            const result = await this.dataService.getCad({id: this.checkedColumns[0].vid, collection: "p_yuanshicadwenjian"});
            this.dialogRef.close(result.cads);
        } else {
            this.syncCheckedItems();
            const result = await this.dataService.getCad({ids: this.checkedItems.map((v) => v.id)});
            this.dialogRef.close(result.cads);
        }
    }

    close() {
        this.dialogRef.close();
    }

    async remove() {
        this.syncCheckedItems();
        const count = this.checkedItems.length;
        if (count < 1) {
            this.message.alert("没有选择CAD");
            return;
        }
        if (await this.message.confirm(`确定要删除这${count}个CAD吗？`)) {
            await this.dataService.removeCads(
                this.data.collection,
                this.checkedItems.map((v) => v.id)
            );
            this.search();
        }
    }
}

export async function openCadListDialog(dialog: MatDialog, config: MatDialogConfig<CadListData>) {
    const ref = dialog.open<CadListComponent, CadListData, CadData[]>(CadListComponent, config);
    return await ref.afterClosed().toPromise();
}
