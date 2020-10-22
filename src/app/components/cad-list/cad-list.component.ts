import {Component, Inject, ViewChild, AfterViewInit, Injector, OnChanges, SimpleChanges, OnInit} from "@angular/core";
import {PageEvent, MatPaginator} from "@angular/material/paginator";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {CadData, CadOption} from "@app/cad-viewer/cad-data/cad-data";
import {Collection, getCadPreview, imgEmpty, imgLoading} from "@app/app.common";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";
import {DomSanitizer} from "@angular/platform-browser";
import {MenuComponent} from "../menu/menu.component";
import {BehaviorSubject} from "rxjs";
import {takeUntil} from "rxjs/operators";

interface CadListData {
	selectMode: "single" | "multiple" | "table";
	checkedItems?: CadData[];
	options?: CadOption[];
	collection: Collection;
	qiliao?: boolean;
}

@Component({
	selector: "app-cad-list",
	templateUrl: "./cad-list.component.html",
	styleUrls: ["./cad-list.component.scss"]
})
export class CadListComponent extends MenuComponent implements AfterViewInit {
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
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;

	constructor(
		public dialogRef: MatDialogRef<CadListComponent, CadData[]>,
		@Inject(MAT_DIALOG_DATA) public data: CadListData,
		private sanitizer: DomSanitizer,
		injector: Injector
	) {
		super(injector);
	}

	async ngAfterViewInit() {
		await this.paginator.initialized.toPromise();
		if (Array.isArray(this.data.checkedItems)) {
			this.checkedItems = this.data.checkedItems;
		}
		this.data.qiliao = this.data.qiliao === true;
		if (!Array.isArray(this.data.options)) {
			this.data.options = [];
		}
		this.getData(1);
		this.checkedIndex.pipe(takeUntil(this.destroyed)).subscribe((i) => {
			if (i >= 0) {
				this.checkedItems = [this.pageData[i].data];
			} else {
				this.checkedItems = [];
			}
		});
		window["l"] = this;
	}

	changePage(event: PageEvent) {
		this.syncCheckedItems();
		this.getData(event.pageIndex + 1);
	}

	async getData(page: number, options: CadOption[] = [], matchType: "and" | "or" = "and") {
		const limit = this.paginator.pageSize;
		const collection = this.data.collection;
		if (this.data.selectMode === "table") {
			this.startLoader();
			const data = await this.dataService.getCadListPage(collection, page, limit, this.searchForm);
			this.stopLoader();
			this.length = data.count;
			this.pageData.length = 0;
			this.tableData = data.data;
		} else {
			const search = this.searchForm;
			const qiliao = this.data.qiliao;
			this.startLoader();
			const data = await this.dataService.getCadDataPage(collection, page, limit, search, options, matchType, qiliao);
			this.stopLoader();
			this.length = data.count;
			this.pageData.length = 0;
			data.data.forEach(async (d, i) => {
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
			return data;
		}
	}

	async submit() {
		if (this.data.selectMode === "table") {
			const data = await this.dataService.getCadData({id: this.checkedColumns[0].vid, collection: "p_yuanshicadwenjian"});
			this.dialogRef.close(data);
		} else {
			this.syncCheckedItems();
			this.dialogRef.close(this.checkedItems.map((v) => v.clone()));
		}
	}

	close() {
		this.dialogRef.close();
	}

	search(withOption = false, matchType: "and" | "or" = "and") {
		this.searchForm = {};
		this.searchForm[this.searchField] = this.searchNameInput;
		this.paginator.pageIndex = 0;
		const options = withOption ? this.data.options : [];
		this.getData(this.paginator.pageIndex + 1, options, matchType);
	}

	async advancedSearch() {
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

	syncCheckedItems() {
		if (this.data.selectMode === "multiple") {
			const toRemove = [];
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
				if (index > -1) {
					this.checkedIndex.next(index);
					this.checkedItems = [this.pageData[index].data];
				} else {
				}
			} else {
				this.checkedItems = [];
			}
			const checkedIndex = this.checkedIndex.getValue();
			if (checkedIndex >= 0) {
				this.checkedItems = [this.pageData[checkedIndex].data];
			} else {
				if (data?.id) {
				}
				this.checkedItems = [];
			}
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
}

export function openCadListDialog(dialog: MatDialog, config: MatDialogConfig<CadListData>) {
	return dialog.open<CadListComponent, CadListData, CadData[]>(CadListComponent, config);
}
