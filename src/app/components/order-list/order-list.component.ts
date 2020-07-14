import {Component, OnInit, Inject} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatDialogConfig} from "@angular/material/dialog";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadDataService, Order} from "@src/app/services/cad-data.service";
import {timeout} from "@src/app/app.common";
import {MatSnackBar} from "@angular/material/snack-bar";

interface OrderListData {
	cad: CadData;
}

@Component({
	selector: "app-order-list",
	templateUrl: "./order-list.component.html",
	styleUrls: ["./order-list.component.scss"]
})
export class OrderListComponent implements OnInit {
	tableData: Order[] = [];
	displayedColumns = ["select", "vid", "code", "s_designPic"];
	checkedColumn: Order;

	constructor(
		public dialogRef: MatDialogRef<OrderListComponent, Order>,
		@Inject(MAT_DIALOG_DATA) public data: OrderListData,
		private dataService: CadDataService,
		private snackBar: MatSnackBar
	) {}

	async ngOnInit() {
		await timeout(0);
		if (!this.data.cad) {
			this.data.cad = new CadData();
		}
		this.tableData = await this.dataService.getOrders(this.data.cad);
	}

	submit() {
		if (this.checkedColumn) {
			this.dialogRef.close(this.checkedColumn);
		} else {
			this.snackBar.open("尚未选择公式");
		}
	}

	cancle() {
		this.dialogRef.close();
	}
}

export function openOrderListDialog(dialog: MatDialog, config: MatDialogConfig<OrderListData>) {
	return dialog.open<OrderListComponent, OrderListData, Order>(OrderListComponent, config);
}
