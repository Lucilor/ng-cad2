import {Component, Inject, ViewChild} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {KlkwpzSource} from "@components/klkwpz/klkwpz";
import {KlkwpzComponent} from "@components/klkwpz/klkwpz.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-klkwpz-dialog",
    templateUrl: "./klkwpz-dialog.component.html",
    styleUrls: ["./klkwpz-dialog.component.scss"]
})
export class KlkwpzDialogComponent {
    name: string;
    source: KlkwpzSource = {};

    @ViewChild(KlkwpzComponent) klkwpzComponent?: KlkwpzComponent;

    constructor(
        public dialogRef: MatDialogRef<KlkwpzDialogComponent, void>,
        @Inject(MAT_DIALOG_DATA) public data: KlkwpzDialogData
    ) {
        this.source = {};
        let name = data.data.name;
        let items = data.data.info.开料孔位配置;
        if (!name) {
            name = "noname";
        }
        if (!items || !Array.isArray(items)) {
            items = [];
        }
        this.name = name;
        this.source[name] = items;
    }

    submit() {
        if (this.klkwpzComponent && this.klkwpzComponent.submit()) {
            this.data.data.info.开料孔位配置 = this.klkwpzComponent.klkwpz.export()[this.name];
            this.dialogRef.close();
        }
    }

    cancle() {
        this.dialogRef.close();
    }
}

export interface KlkwpzDialogData {
    data: CadData;
}

export const openKlkwpzDialog = getOpenDialogFunc<KlkwpzDialogComponent, KlkwpzDialogData, void>(KlkwpzDialogComponent, {
    width: "85%",
    height: "85%"
});
