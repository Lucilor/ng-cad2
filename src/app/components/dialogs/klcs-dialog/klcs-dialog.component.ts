import {Component, Inject, ViewChild} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {KailiaocanshuData, KlcsComponent} from "@components/klcs/klcs.component";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-klcs-dialog",
    templateUrl: "./klcs-dialog.component.html",
    styleUrls: ["./klcs-dialog.component.scss"]
})
export class KlcsDialogComponent {
    @ViewChild(KlcsComponent) klcsComponent?: KlcsComponent;

    constructor(
        public dialogRef: MatDialogRef<KlcsDialogComponent, KlcsDialogOutput>,
        @Inject(MAT_DIALOG_DATA) public data: KlcsDialogInput
    ) {}

    async submit() {
        if (this.klcsComponent) {
            const result = await this.klcsComponent.submit();
            if (result) {
                this.dialogRef.close(result);
            }
        }
    }

    cancel() {
        this.dialogRef.close();
    }
}

export interface KlcsDialogInput {
    source: KailiaocanshuData;
    cadId: string;
}

export type KlcsDialogOutput = KailiaocanshuData;

export const openKlcsDialog = getOpenDialogFunc<KlcsDialogComponent, KlcsDialogInput, KlcsDialogOutput>(KlcsDialogComponent, {
    width: "85%",
    height: "85%"
});
