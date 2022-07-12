import {Component, Inject, ViewChild, AfterViewInit} from "@angular/core";
import {MatCheckboxChange} from "@angular/material/checkbox";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {CadData} from "@cad-viewer";
import {CadDataService, OptionsData} from "@modules/http/services/cad-data.service";
import {SpinnerService} from "@modules/spinner/services/spinner.service";
import {lastValueFrom} from "rxjs";
import {getOpenDialogFunc} from "../dialog.common";

interface CadOptionsData {
    data?: CadData;
    name: string;
    checkedItems: string[];
    multi?: boolean;
    xinghao?: string;
}

@Component({
    selector: "app-cad-options",
    templateUrl: "./cad-options.component.html",
    styleUrls: ["./cad-options.component.scss"]
})
export class CadOptionsComponent implements AfterViewInit {
    pageData: (OptionsData["data"][0] & {checked: boolean})[] = [];
    searchInput = "";
    searchValue = "";
    length = 100;
    pageSizeOptions = [50, 100, 200, 500];
    pageSize = 50;
    checkedItems: string[] = [];
    loaderIds = {optionsLoader: "cadOptions", submitLoaderId: "cadOptionsSubmit"};
    @ViewChild("paginator", {read: MatPaginator}) paginator?: MatPaginator;
    constructor(
        public dialogRef: MatDialogRef<CadOptionsComponent, string[]>,
        @Inject(MAT_DIALOG_DATA) public data: CadOptionsData,
        private dataService: CadDataService,
        private spinner: SpinnerService
    ) {
        this.data.multi = this.data.multi !== false;
        this.checkedItems = this.data.checkedItems?.slice() || [];
    }

    async ngAfterViewInit() {
        if (!this.paginator) {
            return;
        }
        await lastValueFrom(this.paginator.initialized);
        this.getData(1);
    }

    async submit() {
        this.spinner.show(this.loaderIds.submitLoaderId);
        const data = await this.dataService.getOptions({
            name: this.data.name,
            search: this.searchValue,
            data: this.data.data,
            xinghao: this.data.xinghao,
            includeTingyong: true,
            values: this.checkedItems
        });
        this.spinner.hide(this.loaderIds.submitLoaderId);
        this.dialogRef.close(data.data.map((v) => v.name));
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
        this.spinner.show(this.loaderIds.optionsLoader, {text: "获取CAD数据"});
        this.pageData.forEach(({checked, name}) => {
            if (checked && !this.checkedItems.includes(name)) {
                this.checkedItems.push(name);
            }
        });
        const data = await this.dataService.getOptions({
            name: this.data.name,
            search: this.searchValue,
            page,
            limit: this.paginator?.pageSize,
            data: this.data.data,
            xinghao: this.data.xinghao
        });
        this.spinner.hide(this.loaderIds.optionsLoader);
        this.length = data.count;
        this.pageData = data.data.map((v) => ({...v, checked: this.checkedItems.includes(v.name)}));
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
        const index = this.checkedItems.findIndex((v) => v === item.name);
        if (item.checked && index < 0) {
            if (this.data.multi) {
                this.checkedItems.push(item.name);
            } else {
                this.checkedItems = [item.name];
            }
        }
        if (!item.checked && index >= 0) {
            this.checkedItems.splice(index, 1);
        }
    }
}

export const openCadOptionsDialog = getOpenDialogFunc<CadOptionsComponent, CadOptionsData, string[]>(CadOptionsComponent);
