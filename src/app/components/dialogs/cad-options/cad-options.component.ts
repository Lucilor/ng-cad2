import {Component, Inject, ViewChild, AfterViewInit} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {CadData} from "@src/app/cad-viewer";
import {CadDataService} from "@src/app/modules/http/services/cad-data.service";
import {AppStatusService} from "@src/app/services/app-status.service";
import {getOpenDialogFunc} from "../dialog.common";

interface CadOptionsData {
    data?: CadData;
    name: string;
    checkedItems: string[];
    multi?: boolean;
}

@Component({
    selector: "app-cad-options",
    templateUrl: "./cad-options.component.html",
    styleUrls: ["./cad-options.component.scss"]
})
export class CadOptionsComponent implements AfterViewInit {
    pageData: {value: string; img: string; checked: boolean}[] = [];
    searchInput = "";
    searchValue = "";
    length = 100;
    pageSizeOptions = [50, 100, 200, 500];
    pageSize = 50;
    checkedItems: string[] = [];
    loaderId = "OptionsLoader";
    @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;
    constructor(
        public dialogRef: MatDialogRef<CadOptionsComponent, string[]>,
        @Inject(MAT_DIALOG_DATA) public data: CadOptionsData,
        private status: AppStatusService,
        private dataService: CadDataService
    ) {
        this.data.multi = this.data.multi !== false;
        this.checkedItems = this.data.checkedItems?.slice() || [];
    }

    async ngAfterViewInit() {
        await this.paginator?.initialized.toPromise();
        this.getData(1);
    }

    submit() {
        this.dialogRef.close(this.checkedItems.filter((v) => v));
    }

    close() {
        this.dialogRef.close();
    }

    searchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            this.search();
        }
    }

    search() {
        if (!this.paginator) {
            return;
        }
        this.searchValue = this.searchInput;
        this.paginator.pageIndex = 0;
        this.getData(this.paginator.pageIndex + 1);
    }

    changePage(event: PageEvent) {
        this.getData(event.pageIndex + 1);
    }

    async getData(page: number) {
        this.status.startLoader({id: this.loaderId, text: "获取CAD数据"});
        const data = await this.dataService.getOptions(this.data.name, this.searchValue, page, this.paginator?.pageSize, this.data.data);
        this.status.stopLoader();
        this.length = data.count;
        this.pageData.length = 0;
        data.data.forEach((v) => {
            this.pageData.push({value: v.name, img: v.img, checked: this.checkedItems.includes(v.name)});
        });
        return data;
    }

    onCheckboxChange(item: CadOptionsComponent["pageData"][0], event?: MatCheckboxChange) {
        if (!this.data.multi) {
            this.pageData.forEach((v) => (v.checked = false));
        }
        if (event) {
            item.checked = event.checked;
        } else {
            item.checked = !item.checked;
        }
        const index = this.checkedItems.findIndex((v) => v === item.value);
        if (item.checked && index < 0) {
            this.checkedItems.push(item.value);
        }
        if (!item.checked && index >= 0) {
            this.checkedItems.splice(index, 1);
        }
    }
}

export const openCadOptionsDialog = getOpenDialogFunc<CadOptionsComponent, CadOptionsData, string[]>(CadOptionsComponent);
