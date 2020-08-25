import {Component, Inject, ViewChild, AfterViewInit} from "@angular/core";
import {PageEvent, MatPaginator} from "@angular/material/paginator";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {CadData, CadOption} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadDataService} from "@services/cad-data.service";
import {timeout, Collection} from "@src/app/app.common";
import {openCadSearchFormDialog} from "../cad-search-form/cad-search-form.component";

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
	checkedIndex = -1;
	checkedItems: CadData[] = [];
	checkedColumns: any[] = [];
	checkedInOtherPages = false;
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;

	constructor(
		public dialogRef: MatDialogRef<CadListComponent, CadData[]>,
		@Inject(MAT_DIALOG_DATA) public data: CadListData,
		private dataService: CadDataService,
		private dialog: MatDialog
	) {}

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
	}

	changePage(event: PageEvent) {
		this.syncCheckedItems();
		this.getData(event.pageIndex + 1);
	}

	async getData(page: number, options: CadOption[] = [], matchType: "and" | "or" = "and") {
		const limit = this.paginator.pageSize;
		const collection = this.data.collection;
		if (this.data.selectMode === "table") {
			const data = await this.dataService.getCadListPage(collection, page, limit, this.searchForm);
			this.length = data.count;
			this.pageData.length = 0;
			this.tableData = data.data;
		} else {
			const search = this.searchForm;
			const qiliao = this.data.qiliao;
			const data = await this.dataService.getCadDataPage(collection, page, limit, search, options, matchType, qiliao);
			this.length = data.count;
			this.pageData.length = 0;
			data.data.forEach(async (d, i) => {
				try {
					d.entities.dimension.forEach((v) => (v.visible = false));
					d.entities.mtext.forEach((v) => (v.visible = false));
					const cad = new CadViewer(d, {width: this.width, height: this.height, padding: 10});
					const checked = this.checkedItems.find((v) => v.id === d.id) ? true : false;
					if (checked && this.data.selectMode === "single") {
						this.checkedIndex = i;
					}
					const img = cad.exportImage().src;
					this.pageData.push({data: cad.data, img, checked});
					cad.destroy();
					// *(trying to) prevent WebGL contexts lost
					await timeout(0);
				} catch (e) {
					console.warn(e);
					this.pageData.push({
						data: new CadData({id: d.id, name: d.name}),
						img: "",
						checked: false
					});
				}
			});
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
			this.dialogRef.close(this.checkedItems.map((v) => new CadData(v.export())));
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
			this.checkedItems = [this.pageData[this.checkedIndex].data];
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
