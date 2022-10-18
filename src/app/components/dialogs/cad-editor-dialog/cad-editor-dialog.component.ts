import {Component, Inject, ViewChild} from "@angular/core";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@cad-viewer";
import {CadEditorComponent} from "@modules/cad-editor/components/cad-editor/cad-editor.component";
import {MessageService} from "@modules/message/services/message.service";
import {AppStatusService, OpenCadOptions} from "@services/app-status.service";
import {getCadStr} from "@src/app/cad.utils";
import {getOpenDialogFunc} from "../dialog.common";

@Component({
    selector: "app-cad-editor-dialog",
    templateUrl: "./cad-editor-dialog.component.html",
    styleUrls: ["./cad-editor-dialog.component.scss"]
})
export class CadEditorDialogComponent {
    @ViewChild(CadEditorComponent) cadEditor?: CadEditorComponent;
    cadInitStr = "";

    constructor(
        public dialogRef: MatDialogRef<CadEditorDialogComponent, CadEditorOutput>,
        @Inject(MAT_DIALOG_DATA) public data: CadEditorInput,
        private status: AppStatusService,
        private message: MessageService
    ) {
        if (!this.data) {
            this.data = {};
        }
        if (this.data.data) {
            this.cadInitStr = getCadStr(this.data.data);
        }
    }

    async close() {
        if (this.cadEditor) {
            const data = this.status.closeCad(this.status.cad.data);
            const cadCurrStr = getCadStr(data);
            console.log([cadCurrStr, this.cadInitStr, this.cadEditor.cadPrevStr]);
            const isChanged = cadCurrStr !== this.cadInitStr;
            const isSaved = cadCurrStr === this.cadEditor.cadPrevStr;
            if (!this.data.isLocal && isChanged && !isSaved) {
                const yes = await this.message.confirm("cad尚未保存，是否保存？");
                if (yes) {
                    await this.cadEditor.save();
                }
            }
            this.dialogRef.close({data, isChanged});
        } else {
            this.dialogRef.close();
        }
    }
}

export const openCadEditorDialog = getOpenDialogFunc<CadEditorDialogComponent, CadEditorInput, CadEditorOutput>(CadEditorDialogComponent, {
    width: "90%",
    height: "90%"
});

export type CadEditorInput = OpenCadOptions;

export interface CadEditorOutput {
    data: CadData;
    isChanged: boolean;
}
